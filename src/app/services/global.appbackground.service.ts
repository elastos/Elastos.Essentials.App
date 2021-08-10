import { Injectable } from '@angular/core';
import { Logger } from '../logger';
import { LauncherInitService } from '../launcher/services/init.service';
import { DIDSessionsInitService } from '../didsessions/services/init.service';
import { ScannerInitService } from '../scanner/services/init.service';
import { HiveManagerInitService } from '../hivemanager/services/init.service';
import { SettingsInitService } from '../settings/services/init.service';
import { ContactsInitService } from '../contacts/services/init.service';
import { IdentityInitService } from '../identity/services/init.service';
import { WalletInitService } from '../wallet/services/init.service';
import { CRProposalVotingInitService } from '../crproposalvoting/services/init.service';
import { DeveloperToolsInitService } from '../developertools/services/init.service';
import { GlobalJsonRPCService } from './global.jsonrpc.service';


@Injectable({
  providedIn: 'root'
})
export class GlobalAppBackgroundService {

  constructor(
      private launcherInitService: LauncherInitService,
      private didSessionsInitService: DIDSessionsInitService,
      private scannerInitService: ScannerInitService,
      private hiveManagerInitService: HiveManagerInitService,
      private settingsInitService: SettingsInitService,
      private contactsInitService: ContactsInitService,
      private identityInitService: IdentityInitService,
      private walletInitService: WalletInitService,

      private crProposalVotingInitService: CRProposalVotingInitService,
      private developerToolsInitService: DeveloperToolsInitService
      ) {}

  /**
   *
   */
  public async init(): Promise<void> {
      await this.didSessionsInitService.init();
      await this.launcherInitService.init();
      await this.scannerInitService.init();
      await this.hiveManagerInitService.init();
      await this.settingsInitService.init();
      await this.contactsInitService.init();
      await this.identityInitService.init();
      await this.walletInitService.init();
      await this.crProposalVotingInitService.init();
      await this.developerToolsInitService.init();
  }

  /**
   * Stop all app background services, this api Should be called before sign out.
   */
  public async stop(): Promise<void> {
      // We should add service.stop here if we need to wait for the serivce.stop.
      // Otherwise we can stop the service in itself onUserSignOut.
  }
}
