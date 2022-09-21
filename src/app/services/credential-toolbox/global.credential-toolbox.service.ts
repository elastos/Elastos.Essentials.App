import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import moment from 'moment';
import { firstValueFrom } from 'rxjs';
import { VerifiableCredential } from 'src/app/identity/model/verifiablecredential.model';
import { AuthService } from 'src/app/identity/services/auth.service';
import { DIDService } from 'src/app/identity/services/did.service';
import { Logger } from 'src/app/logger';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { environment } from 'src/environments/environment';
import { GlobalCredentialTypesService } from '../credential-types/global.credential.types.service';
import { GlobalPreferencesService } from '../global.preferences.service';
import { GlobalService, GlobalServiceManager } from '../global.service.manager';
import { GlobalStorageService } from '../global.storage.service';
import { NetworkTemplateStore } from '../stores/networktemplate.store';
import { DIDSessionsStore } from './../stores/didsessions.store';

const DID_CHALLENGE = "essentials-credential-toolbox"; // Arbitrary string signed by DID to generate recoverable unique identitiers on the stats service

export const CRED_TOOLBOX_STORAGE_CTX = "credtoolbox";
export const CRED_TOOLBOX_LOG_TAG = "credtoolbox";

// PROD
const SEND_STATS_DELAY_SEC = (24 * 60 * 60); // Min 1 day between each stats upload, min
const CHECK_SEND_STATS_INTERVAL_MS = (5 * 60 * 1000); // Check if it's a right time to send stats every 5 minutes
// DEV
//const SEND_STATS_DELAY_SEC = 0;
//const CHECK_SEND_STATS_INTERVAL_MS = (20 * 1000);

type CredentialTypeWithContext = {
  context: string; // Context url: 'https://ns.elastos.org/credentials/v1'
  shortType: string; // Short type that such as: 'SelfProclaimedCredential'
}

type OwnedCredential = {
  issuanceDate: number; // Timestamp secs
  issuer: string; // DID string of the credential issuer
  types: CredentialTypeWithContext[]; // Short type with associated context - eg: "did://elastos/iXMsb6ippqkCHN3EeWc4QCA9ySnrSgLc4u/DiplomaCredential1234" + "DiplomaCredential"
}

export type UsedCredentialOperation = "request" | "import";

type UsedCredential = {
  operation: UsedCredentialOperation; // Type of DID operation requested by a third party app: request existing user credentials, import new credential...
  usedAt: number; // timestamp (sec)
  types: CredentialTypeWithContext[]; // Short type with associated context - eg: "did://elastos/iXMsb6ippqkCHN3EeWc4QCA9ySnrSgLc4u/DiplomaCredential1234" + "DiplomaCredential"
  appDid?: string; // DID string of the application requesting the DID operation
}

type CredentialStats = {
  userId: string;
  ownedCredentials: OwnedCredential[];
  usedCredentials: UsedCredential[];
}

/**
 * Service responsible for collecting statistics about credential OWNED and USED by the current user.
 * This service runs only if the user agrees too, and in an anonymous way.
 */
@Injectable({
  providedIn: 'root'
})
export class GlobalCredentialToolboxService implements GlobalService {
  private checkSendTimer: unknown; // Timeout handler for checking if it's a right time to send stats

  constructor(
    private http: HttpClient,
    private didService: DIDService,
    private storage: GlobalStorageService,
    private didAuthService: AuthService,
    private prefs: GlobalPreferencesService,
    private credentialTypesService: GlobalCredentialTypesService
  ) { }

  public init(): Promise<void> {
    GlobalServiceManager.getInstance().registerService(this);
    return;
  }

  public onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    void this.checkIfRightTimeToSendStats();
    return;
  }

  public onUserSignOut(): Promise<void> {
    clearTimeout(this.checkSendTimer as any);
    this.checkSendTimer = null;
    return;
  }

  private async checkIfRightTimeToSendStats() {
    // Only send stats if allowed in privacy settings
    if (await this.prefs.getSendStatsToCredentialToolbox(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate)) {
      let lastUploadedTimestamp = await this.storage.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, CRED_TOOLBOX_STORAGE_CTX, "lastuploaded", 0);
      if (moment.unix(lastUploadedTimestamp).add(SEND_STATS_DELAY_SEC, "seconds").isBefore(moment())) {
        Logger.log(CRED_TOOLBOX_LOG_TAG, "It's a good time to send stats");

        await this.sendStatsToService();
      }
    }
    else {
      Logger.log(CRED_TOOLBOX_LOG_TAG, "Not sending credential toolbox stats - disabled by the user");
    }

    this.checkSendTimer = setTimeout(() => {
      void this.checkIfRightTimeToSendStats();
    }, CHECK_SEND_STATS_INTERVAL_MS);
  }

  /**
   * Returns the existing identifier for the current user, on the stat service, if any.
   * Otherwise creates and stores a new one.
   */
  private async getOrCreateStatIdentifier(): Promise<string> {
    let identifier = await this.storage.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, CRED_TOOLBOX_STORAGE_CTX, "identifier", null);
    if (!identifier) {
      identifier = await this.createStatIdentifier();
    }
    return identifier;
  }

  /**
   * Creates a identifier for the stats service. This identifier is built by signing an arbitrary
   * string with current user's DID. This signature becomes our unique identitier
   * in the stat service. It is used so that the stat service can identity consecutive requests coming
   * from a same user (even after reinstallation), but without knowing the DID string itself.
   */
  private async createStatIdentifier(): Promise<string> {
    // Sign challenge with DID. Only if the aster password is unlocked. Otherwise,
    // we don't bother user with a master password prompt and we will collect stats later when the
    // password is unlocked
    let didStorePassword = this.didAuthService.getCurrentUserPassword();
    if (!didStorePassword)
      return null;

    let statsIdentifier = await this.didService.getActiveDid().signData(DID_CHALLENGE, didStorePassword);
    if (!statsIdentifier)
      return null; // Should not happen, but just in cas

    // Store this identifier locally for reuse
    await this.storeStatIdentifier(statsIdentifier);
  }

  private async storeStatIdentifier(identifier: string): Promise<void> {
    await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, CRED_TOOLBOX_STORAGE_CTX, "identifier", identifier);
  }

  /**
   * Goes through the list of all user credentials and builds stats.
   */
  private async buildCredentialsStats(): Promise<CredentialStats> {
    if (!this.didService.getActiveDid())
      return null;

    let userId = await this.getOrCreateStatIdentifier();
    if (!userId)
      return null;

    let stats: CredentialStats = {
      userId,
      ownedCredentials: [],
      usedCredentials: await this.loadUsedCredentials()
    };

    let credentials = this.didService.getActiveDid().credentials;

    // For every credential, get its types and add them to the stats.
    for (let credential of credentials) {
      // Resolve pairs of associated context/types
      let credentialTypesWithContexts = await this.credentialTypesService.resolveTypesWithContexts(credential.pluginVerifiableCredential);
      if (credentialTypesWithContexts && credentialTypesWithContexts.length > 0) {
        // Send the issuer information only for non self-proclaimed credentials, to preserve
        // user's anonimity. "Real" issuers of credentials for others are for now considered
        // as "public apps" for which we don't need to preserve anonimity (at least for now).
        let credentialIssuer = credential.pluginVerifiableCredential.getIssuer();
        let issuer: string = null;
        if (this.didService.getActiveDid().getDIDString() !== credentialIssuer)
          issuer = credentialIssuer;

        let ownedStat: OwnedCredential = {
          issuanceDate: moment(credential.pluginVerifiableCredential.getIssuanceDate()).unix(),
          issuer,
          types: credentialTypesWithContexts
        }
        stats.ownedCredentials.push(ownedStat);
      }
    }

    return stats;
  }

  private async sendStatsToService(): Promise<void> {
    let credentialsStats = await this.buildCredentialsStats();
    if (!credentialsStats) {
      Logger.log(CRED_TOOLBOX_LOG_TAG, "Not sending credential stats for now, stats not built (probably no master password)");
      return;
    }

    Logger.log(CRED_TOOLBOX_LOG_TAG, "Sending stats", credentialsStats);

    try {
      await firstValueFrom(this.http.post<void>(`${environment.CredentialsToolbox.serviceUrl}/statistics`, credentialsStats));
    }
    catch (e) {
      Logger.warn(CRED_TOOLBOX_LOG_TAG, "Failure from the credentials toolbox api", e);
      return;
    }

    // After successfully sending stats, save the date, and clear used credentials locally to not send them again
    await this.saveLastUploaded();
    await this.saveUsedCredentials([]);
  }

  private saveLastUploaded(): Promise<void> {
    return this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, CRED_TOOLBOX_STORAGE_CTX, "lastuploaded", moment().unix());
  }

  /**
   * Records a "used" operation, requested by a third party app to a user.
   * Recorded operations are stored locally and sent to the stats service whenever possible.
   * Once been sent, usage stats are removed from the local storage as the information is
   * already sent for analysis.
   *
   * @param operation DID usage operation such as request credentials, import credentials
   * @param credentialsInvolved List of credentials (DID app format) involved in the operation.
   * @param callingAppDID If known, DID of the external application asking user to do something with the credentials.
   */
  public async recordCredentialUsage(operation: UsedCredentialOperation, credentialsInvolved: VerifiableCredential[], callingAppDID?: string) {
    let usedCredentials = await this.loadUsedCredentials();

    let now = moment().unix();
    for (let credential of credentialsInvolved) {
      // Resolve pairs of associated context/types
      let credentialTypesWithContexts = await this.credentialTypesService.resolveTypesWithContexts(credential.pluginVerifiableCredential);

      usedCredentials.push({
        operation,
        usedAt: now,
        types: credentialTypesWithContexts,
        appDid: callingAppDID
      });
    }

    Logger.log(CRED_TOOLBOX_LOG_TAG, "Recording new credential usage to local storage", usedCredentials);

    // Save locally
    await this.saveUsedCredentials(usedCredentials);
  }

  /**
   * Loads the list of used credentials stats we have on the local storage so far.
   */
  private loadUsedCredentials(): Promise<UsedCredential[]> {
    return this.storage.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, CRED_TOOLBOX_STORAGE_CTX, "usedcredentials", []);
  }

  private saveUsedCredentials(usedCredentials: UsedCredential[]): Promise<void> {
    return this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, CRED_TOOLBOX_STORAGE_CTX, "usedcredentials", usedCredentials);
  }
}
