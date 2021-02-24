import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ContactNotifierService } from 'src/app/services/contactnotifier.service';
import { DIDSessionsService, IdentityEntry } from 'src/app/services/didsessions.service';
import { AppTheme, ThemeService } from 'src/app/services/theme.service';
import { AppManagerPlugin } from 'src/app/TMP_STUBS';
import { NativeService } from './native.service';

@Injectable({
  providedIn: 'root'
})
export class DidmanagerService {
  public signedIdentity: IdentityEntry;

  constructor(
    private translate: TranslateService,
    private native: NativeService,
    private theme: ThemeService,
    private didSessions: DIDSessionsService,
    private contactNotifier: ContactNotifierService,
    private appManager: AppManagerPlugin
  ) { }

  init() {
    this.didSessions.getSignedInIdentity().then((id: IdentityEntry) => {
      console.log('Signed Identity', id);
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
    this.native.showLoading('signing-out');

    setTimeout(async () => {
      await this.didSessions.signOut();
    }, 1000);

    this.native.hideLoading();
  }

  getUserDID(): string {
    return this.signedIdentity.didString;
  }
}
