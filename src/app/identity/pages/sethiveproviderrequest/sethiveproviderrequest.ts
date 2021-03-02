import { Component, NgZone, ViewChild } from '@angular/core';

import { Config } from '../../services/config';
import { DIDService } from '../../services/did.service';
import { UXService } from '../../services/ux.service';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { DIDDocumentPublishEvent } from '../../model/eventtypes.model';
import { ProfileService } from '../../services/profile.service';
import { DIDSyncService } from '../../services/didsync.service';
import { Events } from '../../services/events.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { ThemeService } from 'src/app/didsessions/services/theme.service';

declare let didManager: DIDPlugin.DIDManager;

@Component({
  selector: 'page-sethiveproviderrequest',
  templateUrl: 'sethiveproviderrequest.html',
  styleUrls: ['sethiveproviderrequest.scss']
})
export class SetHiveProviderRequestPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  requestDapp: {
    intentId: number,
    action: string,
    appPackageId: string,
    address: string
  } = null;

  constructor(
    private zone: NgZone,
    private didService: DIDService,
    private events: Events,
    private uxService:UXService,
    private translate: TranslateService,
    private appServices: UXService,
    public profileService: ProfileService,
    private didSyncService: DIDSyncService,
    public theme: ThemeService
  ) {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('sethiveprovider-title'));
    this.titleBar.setNavigationMode(TitleBarNavigationMode.CLOSE);
    this.uxService.makeAppVisible();

    console.log("Received request data:", Config.requestDapp);
    this.requestDapp = Config.requestDapp;
  }

  ionViewDidEnter() {
    // Listen to publication result event to know when the wallet app returns from the "didtransaction" intent
    // request initiated by publish() on a did document.
    this.events.subscribe("diddocument:publishresultpopupclosed", async (result: DIDDocumentPublishEvent)=>{
      console.log("diddocument:publishresultpopupclosed event received in sethiveprovider request", result);
      let status = 'error';
      if (result.published) {
        status = 'published';
      } else if (result.cancelled) {
        status = 'cancelled';
      }
      await this.sendIntentResponse(status);
    });
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
    await this.appServices.sendIntentResponse(this.requestDapp.action, {status: status}, this.requestDapp.intentId);
  }

  async addOrUpdateService(password: string) {
    console.log("Creating service");

    let service: DIDPlugin.Service = await this.didService.getActiveDid().getDIDDocument().getService('#hivevault');
    if (service) {
        console.log('the #hivevault service already exist, update it');
        await this.didService.getActiveDid().getDIDDocument().removeService('#hivevault', password);
    }

    service = didManager.ServiceBuilder.createService('#hivevault', 'HiveVault', this.requestDapp.address);
    await this.didService.getActiveDid().getDIDDocument().addService(service, password);
  }

  async rejectRequest() {
    await this.sendIntentResponse('cancelled');
  }
}
