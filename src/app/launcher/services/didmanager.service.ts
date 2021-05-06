import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { ContactNotifierService } from 'src/app/services/contactnotifier.service';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalService } from 'src/app/services/global.service.manager';


@Injectable({
  providedIn: 'root'
})
export class DIDManagerService extends GlobalService {
  public signedIdentity: IdentityEntry;

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
  }

  public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    Logger.log("Launcher", "Signed in identity changed", signedInIdentity);
    this.signedIdentity = signedInIdentity;
  }

  public async onUserSignOut(): Promise<void> {

  }

  async shareIdentity() {
    Logger.log('Launcher', 'Sharing identity', this.signedIdentity);
    const carrierAddress = await this.contactNotifier.getCarrierAddress();

    const addFriendUrl =
      "https://contact.elastos.net/addfriend?did=" +
      encodeURIComponent(this.signedIdentity.didString) +
      '&carrier=' + carrierAddress;

    this.globalIntentService.sendIntent("share", {
      title: this.translate.instant("common.share-add-me-as-friend"),
      url: addFriendUrl,
    });
  }

  async signOut() {
    // TODO @chad - I don't understand why the loading popup doesn't hide automatically - this.native.showLoading('signing-out');

    setTimeout(async () => {
      await this.didSessions.signOut();
    }, 10);

    // TODO @chad this.native.hideLoading();
  }

  getUserDID(): string {
    return this.signedIdentity.didString;
  }
}
