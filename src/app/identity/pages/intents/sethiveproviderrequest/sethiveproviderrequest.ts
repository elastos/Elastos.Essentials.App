import { Component, ViewChild } from '@angular/core';
import { DIDService } from '../../../services/did.service';
import { UXService } from '../../../services/ux.service';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../services/auth.service';
import { DIDDocumentPublishEvent } from '../../../model/eventtypes.model';
import { ProfileService } from '../../../services/profile.service';
import { DIDSyncService } from '../../../services/didsync.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarNavigationMode, TitleBarIconSlot, BuiltInIcon, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { SetHiveProviderIdentityIntent } from 'src/app/identity/model/identity.intents';
import { IntentReceiverService } from 'src/app/identity/services/intentreceiver.service';
import { Logger } from 'src/app/logger';
import { Subscription } from 'rxjs';
import { Events } from 'src/app/services/events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { DIDPublicationStatus, GlobalPublicationService } from 'src/app/services/global.publication.service';

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

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    private didService: DIDService,
    private events: Events,
    private translate: TranslateService,
    private appServices: UXService,
    public profileService: ProfileService,
    private didSyncService: DIDSyncService,
    public theme: GlobalThemeService,
    private intentService: IntentReceiverService,
    private globalPublicationService: GlobalPublicationService
  ) {
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    if (this.publishresultSubscription) {
      this.publishresultSubscription.unsubscribe();
      this.publishresultSubscription = null;
    }
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('identity.sethiveprovider-title'));
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: null, iconPath: BuiltInIcon.CLOSE }); // Replace ela logo with close icon
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      void this.rejectRequest();
    });
    this.receivedIntent = this.intentService.getReceivedIntent();
  }

  ionViewWillLeave() {
      this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  acceptRequest() {
    // Prompt password if needed
    void AuthService.instance.checkPasswordThenExecute(async ()=>{
      let password = AuthService.instance.getCurrentUserPassword();

      // Create the main application profile credential
      await this.addOrUpdateService(password);

      let pubSubscription = this.globalPublicationService.publicationStatus.subscribe((status) => {
        if (status.status == DIDPublicationStatus.PUBLISHED_AND_CONFIRMED) {
          pubSubscription.unsubscribe();
          void this.sendIntentResponse('published');
        } else if (status.status == DIDPublicationStatus.FAILED_TO_PUBLISH) {
          pubSubscription.unsubscribe();
          void this.sendIntentResponse('error');
        }
      });
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
        Logger.log("identity", 'The #hivevault service already exists, updating it');
        await this.didService.getActiveDid().getDIDDocument().removeService('#hivevault', password);
    }

    service = didManager.ServiceBuilder.createService('#hivevault', 'HiveVault', this.receivedIntent.params.address);
    await this.didService.getActiveDid().getDIDDocument().addService(service, password);
  }

  async rejectRequest() {
    await this.sendIntentResponse('cancelled');
  }
}
