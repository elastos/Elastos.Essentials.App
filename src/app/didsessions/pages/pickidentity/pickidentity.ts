import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { IdentityService, IdentityGroup } from 'src/app/didsessions/services/identity.service';
import { UXService } from 'src/app/didsessions/services/ux.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TranslateService } from '@ngx-translate/core';
import { PopupProvider } from 'src/app/didsessions/services/popup';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot, BuiltInIcon, TitleBarForegroundMode, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { Events } from 'src/app/services/events.service';

@Component({
  selector: 'page-pickidentity',
  templateUrl: 'pickidentity.html',
  styleUrls: ['./pickidentity.scss']
})
export class PickIdentityPage {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  groupedIdentities: IdentityGroup[] = [];

  popover: any = null;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public identityService: IdentityService,
    private changeDetector: ChangeDetectorRef,
    public uxService: UXService,
    public theme: GlobalThemeService,
    public translate: TranslateService,
    private events: Events,
    public popupProvider: PopupProvider,
    private splashScreen: SplashScreen,
    private didSessions: GlobalDIDSessionsService,
  ) {
      this.events.subscribe("identityadded", newIdentity => {
        Logger.log('didsessions', "PickIdentiy - Identity added, reloading content");
        void this.loadIdentities();
      });

      this.events.subscribe("identityremoved", newIdentity => {
        Logger.log('didsessions', "PickIdentiy - Identity deleted, reloading content");
        void this.loadIdentities();
      });
  }

  ionViewWillEnter() {
    if(!this.theme.darkMode) {
      this.titleBar.setTheme('#F5F5FD', TitleBarForegroundMode.DARK);
    } else {
      this.titleBar.setTheme('#121212', TitleBarForegroundMode.LIGHT);
    }

    this.titleBar.setTitle(this.translate.instant("didsessions.pick-identity"));
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: "language", iconPath: BuiltInIcon.EDIT });
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      this.uxService.onTitleBarItemClicked(icon);
    });

    void this.loadIdentities();

    void this.identityService.getSignedIdentity();
  }

  ionViewDidEnter() {
    // We are ready, we can hide the splash screen
    this.splashScreen.hide();
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  async loadIdentities() {
    this.groupedIdentities = await this.identityService.loadGroupedIdentities();
    this.changeDetector.detectChanges(); // Force angular to catch change in the array, in case of update
    Logger.log("didsessions", "Grouped identities:", this.groupedIdentities);

    if (this.availableIdentitiesCount() === 0) {
      // Maybe we've just deleted the last identity. Then go back to the identity creation screen
      void this.uxService.navigateRoot();
    }

    this.addAvatars();
  }

  addAvatars() {
    this.groupedIdentities.map((group) => {
      group.entries.forEach((entry) => {
        Logger.log('didsessions', 'Identity', entry);
      });
    })
  }

  async signIn(identityEntry: IdentityEntry) {
    Logger.log('didsessions', "Trying to sign in with DID "+identityEntry.didString);
    void this.uxService.showLoading(this.translate.instant("didsessions.prepare.sign-in-title"));
    await this.identityService.signIn(identityEntry, true);
    void this.uxService.hideLoading();
  }

  /**
   * Used to create a new DID inside a brand new DID store = new mnemonic.
   */
  createIdentity() {
    this.uxService.go('/didsessions/createidentity');
  }

  /**
   * Requests the DID app to delete an identity
   */
  async deleteIdentity(identityEntry: IdentityEntry) {
    let couldDelete = await this.identityService.deleteIdentity(identityEntry);
    if (!couldDelete) {
      // TODO: visual error feedback to user
    }
    else {
      // TODO: visual success feedback to user
    }
  }

  async deleteAllTest() {
    let identities = await this.didSessions.getIdentityEntries();

    for (let identity of identities) {
      await this.didSessions.deleteIdentityEntry(identity.didString)
    }
  }

  availableIdentitiesCount(): number {
    let count = 0;
    for (let group of this.groupedIdentities) {
      for (let identity of group.entries) {
        count++;
      }
    }
    return count;
  }
}
