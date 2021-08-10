import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { ContactNotifierService } from 'src/app/services/contactnotifier.service';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';


@Injectable({
  providedIn: 'root'
})
export class DIDManagerService extends GlobalService {
  constructor(
    private translate: TranslateService,
    private native: GlobalNativeService ,
    private theme: GlobalThemeService,
    private didSessions: GlobalDIDSessionsService,
    private globalIntentService: GlobalIntentService,
    private contactNotifier: ContactNotifierService,
  ) {
    super();
  }

  init() {
    GlobalServiceManager.getInstance().registerService(this);
  }

  public onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    //this.signedIdentity = signedInIdentity;
    return;
  }

  public async onUserSignOut(): Promise<void> {

  }

  public get signedIdentity(): IdentityEntry {
    return this.didSessions.getSignedInIdentity();
  }

  async shareIdentity() {
    Logger.log('Launcher', 'Sharing identity', this.signedIdentity);
    const carrierAddress = await this.contactNotifier.getCarrierAddress();

    const addFriendUrl =
      "https://contact.elastos.net/addfriend?did=" +
      encodeURIComponent(this.signedIdentity.didString) +
      '&carrier=' + carrierAddress;

    void this.globalIntentService.sendIntent("share", {
      title: this.translate.instant("common.share-add-me-as-friend"),
      url: addFriendUrl,
    });
  }

  signOut() {
    setTimeout(() => {
      void this.didSessions.signOut();
    }, 10);
  }

  getUserDID(): string {
    return this.signedIdentity.didString;
  }
}
