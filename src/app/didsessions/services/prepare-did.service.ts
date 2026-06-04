import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { sleep } from 'src/app/helpers/sleep.helper';
import { Logger } from 'src/app/logger';
import { GlobalHiveService } from 'src/app/services/global.hive.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { DIDPublicationStatus, GlobalPublicationService } from 'src/app/services/global.publication.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { WalletCreationService } from 'src/app/wallet/services/walletcreation.service';
import { IdentityService } from './identity.service';

declare let didManager: DIDPlugin.DIDManager;

// Minimal duration during which a slide remains shown before going to the next one.
const MIN_SLIDE_SHOW_DURATION_MS = 4000;

export interface PrepareDIDCallbacks {
  onSlideChange: (slideIndex: number) => void;
  onError: (step: string, error: string) => void;
  onIdentityPublished: () => void;
  onWalletCompleted: () => void;
  onAllStepsCompleted: () => void;
}

export interface PrepareDIDOptions {
  isLightweightMode: boolean;
  callbacks: PrepareDIDCallbacks;
}

@Injectable({
  providedIn: 'root'
})
export class PrepareDIDService {
  private PUBLISH_DID_SLIDE_INDEX = 0;
  private SIGN_IN_SLIDE_INDEX = 1;
  private HIVE_SETUP_SLIDE_INDEX = 2;
  private DEFAULT_WALLET_SLIDE_INDEX = 3;
  private ALL_DONE_SLIDE_INDEX = 4;

  // Process state
  private publishedDID: DIDPlugin.DIDDocument = null;
  private vaultAddress: string = null;
  private walletStepCompleted = false;
  private hiveSetupAlreadyTried = false;
  private isRunning = false;

  private lightweightMode = false;

  constructor(
    private identityService: IdentityService,
    private walletCreationService: WalletCreationService,
    private native: GlobalNativeService,
    private globalHiveService: GlobalHiveService,
    private globalPublicationService: GlobalPublicationService,
    private translate: TranslateService
  ) {}

  async startPreparation(options: PrepareDIDOptions): Promise<void> {
    if (this.isRunning) {
      Logger.warn('didsessions', 'Prepare DID service is already running');
      return;
    }

    this.isRunning = true;
    this.resetState();

    try {
      this.lightweightMode = options.isLightweightMode;
      if (options.isLightweightMode) {
        await this.runLightweightMode(options.callbacks);
      } else {
        await this.runAdvancedMode(options.callbacks);
      }
    } catch (error) {
      Logger.error('didsessions', 'Error during preparation:', error);
      options.callbacks.onError('general', error.toString());
    } finally {
      this.isRunning = false;
    }
  }

  private async runAdvancedMode(callbacks: PrepareDIDCallbacks): Promise<void> {
    Logger.log('didsessions', 'Running advanced mode preparation');

    let nextSlideIndex = -1;
    let operationSuccessful = false;

    do {
      nextSlideIndex = await this.computeNextSlideIndex(nextSlideIndex);
      Logger.log('didsessions', 'Next slide index will be:', nextSlideIndex);

      callbacks.onSlideChange(nextSlideIndex);

      switch (nextSlideIndex) {
        case this.PUBLISH_DID_SLIDE_INDEX:
          operationSuccessful = await this.publishIdentity(callbacks);
          break;
        case this.SIGN_IN_SLIDE_INDEX:
          operationSuccessful = await this.signIn(callbacks);
          Logger.log('didsessions', 'Sign in completed');
          break;
        case this.HIVE_SETUP_SLIDE_INDEX:
          operationSuccessful = await this.setupHiveStorage(this.vaultAddress, callbacks);
          if (!operationSuccessful) {
            // Hive setup has failed? Show a error toast to let user know, but we dont block
            // the on boarding so we just continue to the next step.
            this.native.errToast('didsessions.error-hive-storage-failed', 4000);
            operationSuccessful = true;
          }
          break;
        case this.DEFAULT_WALLET_SLIDE_INDEX:
          await this.createWalletFromIdentity(callbacks);
          break;
        default:
        // Do nothing.
      }
    } while (nextSlideIndex !== this.ALL_DONE_SLIDE_INDEX && operationSuccessful);

    Logger.log('didsessions', 'Advanced mode preparation completed');
    callbacks.onAllStepsCompleted();
  }

  private async runLightweightMode(callbacks: PrepareDIDCallbacks): Promise<void> {
    Logger.log('didsessions', 'Running lightweight mode preparation');

    // Awaiting sign in completion is required as onUserSignIn is triggered in multiple services.
    await this.runSignInStep(callbacks);

    // Create wallet using the same mnemonic and wait for completion.
    await this.runWalletCreationStep(callbacks);

    // Let other steps continue in background while user already reached home screen
    this.runPublishIdentityStep(callbacks, false)
      .then(() => {
        // Hive requires did to be published to initialize.
        return this.runHiveSetupStep(callbacks);
      })
      .catch(error => {
        Logger.warn('didsessions', 'Some background steps failed:', error);
      });

    Logger.log('didsessions', 'Lightweight mode preparation completed (wallet ready)');
    callbacks.onAllStepsCompleted();
  }

  private async runPublishIdentityStep(callbacks: PrepareDIDCallbacks, shouldAwait = true): Promise<void> {
    try {
      if (await this.needToPublishIdentity()) {
        callbacks.onSlideChange(this.PUBLISH_DID_SLIDE_INDEX);
        if (shouldAwait) {
          await this.publishIdentity(callbacks);
        } else {
          void this.publishIdentity(callbacks);
        }
      }
    } catch (error) {
      Logger.warn('didsessions', 'Publish identity step failed:', error);
    }
  }

  private async runSignInStep(callbacks: PrepareDIDCallbacks): Promise<void> {
    try {
      // Check if sign in is needed
      if (DIDSessionsStore.signedInDIDString === null) {
        callbacks.onSlideChange(this.SIGN_IN_SLIDE_INDEX);
        await this.signIn(callbacks);
      }
    } catch (error) {
      Logger.warn('didsessions', 'Sign in step failed:', error);
    }
  }

  private async runHiveSetupStep(callbacks: PrepareDIDCallbacks): Promise<void> {
    try {
      if (!(await this.isHiveVaultReady())) {
        callbacks.onSlideChange(this.HIVE_SETUP_SLIDE_INDEX);
        await this.setupHiveStorage(this.vaultAddress, callbacks);
      }
    } catch (error) {
      Logger.warn('didsessions', 'Hive setup step failed:', error);
    }
  }

  private async runWalletCreationStep(callbacks: PrepareDIDCallbacks): Promise<void> {
    try {
      if (!(await this.defaultWalletExists())) {
        callbacks.onSlideChange(this.DEFAULT_WALLET_SLIDE_INDEX);
        await this.createWalletFromIdentity(callbacks);
      }
    } catch (error) {
      Logger.warn('didsessions', 'Wallet creation step failed:', error);
    }
  }

  private resetState(): void {
    this.publishedDID = null;
    this.vaultAddress = null;
    this.walletStepCompleted = false;
    this.hiveSetupAlreadyTried = false;
  }

  private async computeNextSlideIndex(currentSlideIndex: number): Promise<number> {
    Logger.log('didsessions', 'Computing next slide index');

    if (currentSlideIndex <= this.PUBLISH_DID_SLIDE_INDEX && (await this.needToPublishIdentity())) {
      return this.PUBLISH_DID_SLIDE_INDEX;
    } else if (currentSlideIndex <= this.SIGN_IN_SLIDE_INDEX) {
      if (DIDSessionsStore.signedInDIDString === null) {
        return this.SIGN_IN_SLIDE_INDEX;
      }
    } else if (currentSlideIndex <= this.HIVE_SETUP_SLIDE_INDEX && !(await this.isHiveVaultReady())) {
      return this.HIVE_SETUP_SLIDE_INDEX;
    }
    if (currentSlideIndex < this.DEFAULT_WALLET_SLIDE_INDEX && !(await this.defaultWalletExists())) {
      return this.DEFAULT_WALLET_SLIDE_INDEX;
    } else {
      return this.ALL_DONE_SLIDE_INDEX;
    }
  }

  private async needToPublishIdentity(): Promise<boolean> {
    this.publishedDID = await this.fetchPublishedDID();
    return this.publishedDID == null || !this.publishedIdentityHasHiveVault(this.publishedDID);
  }

  private fetchPublishedDID(): Promise<DIDPlugin.DIDDocument> {
    Logger.log(
      'didsessions',
      'Checking if identity is published for ',
      this.identityService.identityBeingCreated.did.getDIDString()
    );
    return new Promise<DIDPlugin.DIDDocument>((resolve, reject) => {
      didManager.resolveDidDocument(
        this.identityService.identityBeingCreated.did.getDIDString(),
        true,
        doc => {
          Logger.log('didsessions', 'Resolved identity:', doc);
          resolve(doc);
        },
        err => reject(err)
      );
    });
  }

  private publishedIdentityHasHiveVault(doc: DIDPlugin.DIDDocument | null): boolean {
    if (!doc) return false;

    return this.globalHiveService.documentHasVault(doc);
  }

  private async isHiveVaultReady(): Promise<boolean> {
    Logger.log('didsessions', 'Checking if hive vault is ready');
    let vaultStatus = await this.globalHiveService.vaultStatus.value;
    Logger.log('didsessions', 'Hive vault status:', vaultStatus);

    // Try to check hive only once. If this has failed a first time we continue to not block the user.
    if (this.hiveSetupAlreadyTried) {
      Logger.warn('didsessions', 'Considering the hive vault as ready. Already tried to setup once');
      return true;
    }

    return vaultStatus && vaultStatus.publishedInfo != null && vaultStatus.publishedInfo.vaultAddress != null;
  }

  private async appendHiveInfoToDID(): Promise<string> {
    Logger.log('didsessions', 'Adding hive vault information to local DID');
    let didDocument = await this.identityService.getCreatedDIDDocument();
    try {
      this.vaultAddress = await this.globalHiveService.addRandomHiveToDIDDocument(
        didDocument,
        this.identityService.identityBeingCreated.storePass
      );
    } catch (e) {
      Logger.warn('didsessions', 'Do not support hive');
    }
    return this.vaultAddress;
  }

  private async getHiveProviderUrl(): Promise<string> {
    let didDocument = await this.identityService.getCreatedDIDDocument();
    return this.globalHiveService.getDocumentVaultProviderUrl(didDocument);
  }

  private defaultWalletExists(): Promise<boolean> {
    // For now, always returns a simulated value without really checking because we don't have a API for that in the wallet sdk.
    return Promise.resolve(this.walletStepCompleted);
  }

  private async publishIdentity(callbacks: PrepareDIDCallbacks): Promise<boolean> {
    Logger.log('didsessions', 'Publishing identity');

    // Add a random hive vault provider to the DID Document before publishing it (to avoid
    // publishing again right after), only if there is no vault configured yet.
    if (!this.publishedIdentityHasHiveVault(this.publishedDID)) {
      this.vaultAddress = await this.appendHiveInfoToDID();
    }

    try {
      await Promise.all([sleep(MIN_SLIDE_SHOW_DURATION_MS), this.publishIdentityReal(callbacks)]);

      // NOTE: A bit dirty workaround to "make sure" the resolver node that will tell us if the
      // identity is published, had time to sync the latest info from the chain, because the resolver
      // node is not always the node used to publish the DID and resolving right after publish
      // sometimes returns NULL.
      Logger.log('didsessions', 'Waiting a moment to let the DID resolver node sync the latest data');
      await sleep(5000);

      // Resolve the published DID to make sure everything is all right
      Logger.log('didsessions', 'Verifying if the identity is well published', this.publishedDID);
      if (await this.needToPublishIdentity()) {
        Logger.warn('didsessions', 'Identity is supposed to be published and ready but cannot be resolved');
        const error = this.translate.instant('didsessions.error-can-not-publish');
        callbacks.onError('publish', error);
        return false;
      }

      return true;
    } catch (e) {
      Logger.warn('didsessions', 'Publish identity error in prepare did:', e);
      const error = this.translate.instant('didsessions.error-failed-to-publish') + e;
      callbacks.onError('publish', error);
      return false;
    }
  }

  private publishIdentityReal(callbacks: PrepareDIDCallbacks): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    return new Promise<boolean>(resolve => {
      void this.globalPublicationService.resetStatus().then(async () => {
        let publicationStatusSub = this.globalPublicationService.publicationStatus.subscribe(status => {
          if (status.status == DIDPublicationStatus.PUBLISHED_AND_CONFIRMED) {
            Logger.log('didsessions', 'Identity publication success');
            publicationStatusSub.unsubscribe();
            callbacks.onIdentityPublished();
            resolve(true);
          } else if (status.status == DIDPublicationStatus.FAILED_TO_PUBLISH) {
            Logger.log('didsessions', 'Identity publication failure');
            publicationStatusSub.unsubscribe();
            callbacks.onError('publish', this.translate.instant('didsessions.error-failed-to-publish'));
            resolve(false);
          }
        });

        try {
          await this.globalPublicationService.publishCordovaDIDFromStore(
            this.identityService.identityBeingCreated.didStore.getId(),
            this.identityService.identityBeingCreated.storePass,
            this.identityService.identityBeingCreated.did.getDIDString()
          );
        } catch (e) {
          Logger.log('didsessions', 'Identity publication failure (publishDIDFromStore)', e);
          publicationStatusSub.unsubscribe();
          resolve(false);
        }
      });
    });
  }

  private async signIn(callbacks: PrepareDIDCallbacks): Promise<boolean> {
    Logger.log('didsessions', 'Signing in');
    try {
      await Promise.all([
        sleep(MIN_SLIDE_SHOW_DURATION_MS),
        this.identityService.signIn(this.identityService.identityBeingCreated.didSessionsEntry, false, false, this.lightweightMode)
      ]);
      Logger.log('didsessions', 'Sign in complete');
      return true;
    } catch (e) {
      Logger.warn('didsessions', 'Sign in error in prepare did:', e);
      const error = this.translate.instant('didsessions.error-failed-to-sign') + e;
      callbacks.onError('signIn', error);
      return false;
    }
  }

  private async setupHiveStorage(vaultAddress: string, callbacks: PrepareDIDCallbacks): Promise<boolean> {
    Logger.log('didsessions', 'Setting up hive storage');

    this.hiveSetupAlreadyTried = true;

    // When importing a DID, vaultAddress was not set because we didn't have to create a new DID
    // witha  default hive address. So we need to retrieve the existing address from the imported DID, if any.
    if (!vaultAddress) vaultAddress = await this.getHiveProviderUrl();

    try {
      await Promise.all([
        sleep(MIN_SLIDE_SHOW_DURATION_MS),
        this.globalHiveService.subscribeToHiveProvider(vaultAddress)
      ]);
      return true;
    } catch (e) {
      Logger.warn('didsessions', 'Hive storage error in prepare did:', e);
      const error = this.translate.instant('didsessions.error-hive-storage-setup-failed') + e;
      callbacks.onError('hive', error);
      return false;
    }
  }

  private async createWalletFromIdentity(callbacks: PrepareDIDCallbacks): Promise<void> {
    Logger.log('didsessions', 'Creating a default wallet with the same mnemonic as the identity');
    await Promise.all([
      sleep(MIN_SLIDE_SHOW_DURATION_MS),
      this.walletCreationService.createWalletFromNewIdentity(
        this.identityService.identityBeingCreated.name,
        this.identityService.identityBeingCreated.mnemonic,
        this.identityService.identityBeingCreated.mnemonicPassphrase
      )
    ]);

    this.walletStepCompleted = true;
    callbacks.onWalletCompleted();
  }
}
