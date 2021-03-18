import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { ContactNotifierService } from 'src/app/services/contactnotifier.service';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';


@Injectable({
  providedIn: 'root'
})
export class DIDManagerService {
  public signedIdentity: IdentityEntry;

  constructor(
    private translate: TranslateService,
    private native: GlobalNativeService ,
    private theme: GlobalThemeService,
    private didSessions: GlobalDIDSessionsService,
    private globalIntentService: GlobalIntentService,
    private contactNotifier: ContactNotifierService,
  ) { }

  init() {
    this.didSessions.signedInIdentityListener.subscribe((id: IdentityEntry) => {
      Logger.log("Launcher", "Signed in identity changed", id);
      this.signedIdentity = id;
    });
  }

  async shareIdentity() {
    Logger.log('Launcher', 'Sharing identity', this.signedIdentity);
    const carrierAddress = await this.contactNotifier.getCarrierAddress();

    const addFriendUrl =
      "https://contact.elastos.net/addfriend?did=" +
      encodeURIComponent(this.signedIdentity.didString) +
      '&carrier=' + carrierAddress;

    this.globalIntentService.sendIntent("share", {
      title: this.translate.instant("share-add-me-as-friend"),
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
