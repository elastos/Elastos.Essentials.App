import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { ContactNotifierService } from 'src/app/services/contactnotifier.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';

@Injectable({
  providedIn: 'root'
})
export class DIDManagerService extends GlobalService {
  constructor(
    private translate: TranslateService,
    private native: GlobalNativeService,
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

  shareIdentity() {
    Logger.log('Launcher', 'Sharing identity', this.signedIdentity);

    void this.globalIntentService.sendIntent("share", {
      title: this.translate.instant("common.here-is-my-did"),
      url: this.signedIdentity.didString,
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
