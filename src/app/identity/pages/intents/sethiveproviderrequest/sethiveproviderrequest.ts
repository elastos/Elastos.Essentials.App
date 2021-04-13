import { Component, ViewChild } from '@angular/core';
import { DIDService } from '../../../services/did.service';
import { UXService } from '../../../services/ux.service';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../services/auth.service';
import { DIDDocumentPublishEvent } from '../../../model/eventtypes.model';
import { ProfileService } from '../../../services/profile.service';
import { DIDSyncService } from '../../../services/didsync.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { ThemeService } from 'src/app/didsessions/services/theme.service';
import { SetHiveProviderIdentityIntent } from 'src/app/identity/model/identity.intents';
import { IntentReceiverService } from 'src/app/identity/services/intentreceiver.service';
import { Logger } from 'src/app/logger';
import { Subscription } from 'rxjs';
import { Events } from 'src/app/services/events.service';

declare let didManager: DIDPlugin.DIDManager;

@Component({
  selector: 'page-sethiveproviderrequest',
  templateUrl: 'sethiveproviderrequest.html',
  styleUrls: ['sethiveproviderrequest.scss']
})
export class SetHiveProviderRequestPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public receivedIntent: SetHiveProviderIdentityIntent = null;
  private publishresultSubscription: Subscription = null;

  constructor(
    private didService: DIDService,
    private events: Events,
    private translate: TranslateService,
    private appServices: UXService,
    public profileService: ProfileService,
    private didSyncService: DIDSyncService,
    public theme: ThemeService,
    private intentService: IntentReceiverService
  ) {
  }

  ngOnInit() {
    // Listen to publication result event to know when the wallet app returns from the "didtransaction" intent
    // request initiated by publish() on a did document.
    this.publishresultSubscription = this.events.subscribe("diddocument:publishresultpopupclosed", async (result: DIDDocumentPublishEvent)=>{
      Logger.log("identity", "diddocument:publishresultpopupclosed event received in sethiveprovider request", result);
      let status = 'error';
      if (result.published) {
        status = 'published';
      } else if (result.cancelled) {
        status = 'cancelled';
      }
      await this.sendIntentResponse(status);
    });
  }

  ngOnDestroy() {
    if (this.publishresultSubscription) {
      this.publishresultSubscription.unsubscribe();
      this.publishresultSubscription = null;
    }
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('sethiveprovider-title'));
    this.titleBar.setNavigationMode(TitleBarNavigationMode.CLOSE);
    this.receivedIntent = this.intentService.getReceivedIntent();
  }

  async acceptRequest() {
    // Prompt password if needed
    AuthService.instance.checkPasswordThenExecute(async ()=>{
      let password = AuthService.instance.getCurrentUserPassword();

      // Create the main application profile credential
      await this.addOrUpdateService(password);

      await this.didSyncService.publishActiveDIDDIDDocument(password);
    }, ()=>{
      // Cancelled
    });
  }

  async sendIntentResponse(status: string) {
    // Send the intent response as everything is completed
    await this.appServices.sendIntentResponse(this.receivedIntent.action, {status: status}, this.receivedIntent.intentId);
  }

  async addOrUpdateService(password: string) {
    Logger.log("identity", "Creating service");

    let service: DIDPlugin.Service = await this.didService.getActiveDid().getDIDDocument().getService('#hivevault');
    if (service) {
        Logger.log("identity", 'the #hivevault service already exist, update it');
        await this.didService.getActiveDid().getDIDDocument().removeService('#hivevault', password);
    }

    service = didManager.ServiceBuilder.createService('#hivevault', 'HiveVault', this.receivedIntent.params.address);
    await this.didService.getActiveDid().getDIDDocument().addService(service, password);
  }

  async rejectRequest() {
    await this.sendIntentResponse('cancelled');
  }
}
