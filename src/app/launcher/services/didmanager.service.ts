import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ContactNotifierService } from 'src/app/services/contactnotifier.service';
import { DIDSessionsService, IdentityEntry } from 'src/app/services/didsessions.service';
import { AppTheme, GlobalThemeService } from 'src/app/services/global.theme.service';
import { TemporaryAppManagerPlugin } from 'src/app/TMP_STUBS';
import { AppmanagerService } from './appmanager.service';
import { NativeService } from './native.service';
import { TipsService } from './tips.service';

@Injectable({
  providedIn: 'root'
})
export class DIDManagerService {
  public signedIdentity: IdentityEntry;

  constructor(
    private translate: TranslateService,
    private native: NativeService,
    private theme: GlobalThemeService,
    private didSessions: DIDSessionsService,
    private contactNotifier: ContactNotifierService,
    private appManager: TemporaryAppManagerPlugin,
  ) { }

  init() {
    this.didSessions.signedInIdentityListener.subscribe((id: IdentityEntry) => {
      console.log("Launcher: signed in identity changed", id);
      this.signedIdentity = id;
    });
  }

  async shareIdentity() {
    console.log('Sharing identity', this.signedIdentity);
    const carrierAddress = await this.contactNotifier.getCarrierAddress();

    const addFriendUrl =
      "https://contact.elastos.net/addfriend?did=" +
      encodeURIComponent(this.signedIdentity.didString) +
      '&carrier=' + carrierAddress;

    this.appManager.sendIntent("share", {
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
