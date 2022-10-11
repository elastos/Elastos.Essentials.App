import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { LottieSplashScreen } from '@awesome-cordova-plugins/lottie-splash-screen/ngx';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarForegroundMode, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { IdentityGroup, IdentityService } from 'src/app/didsessions/services/identity.service';
import { PopupProvider } from 'src/app/didsessions/services/popup';
import { UXService } from 'src/app/didsessions/services/ux.service';
import { Logger } from 'src/app/logger';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNetworksService, LRW_TEMPLATE, MAINNET_TEMPLATE, TESTNET_TEMPLATE } from 'src/app/services/global.networks.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';

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
    private events: GlobalEvents,
    public popupProvider: PopupProvider,
    private lottieSplashScreen: LottieSplashScreen,
    private globalNetworksService: GlobalNetworksService,
    private didSessions: GlobalDIDSessionsService,
    private nativeService: GlobalNativeService,
  ) {
    GlobalFirebaseService.instance.logEvent("didsessions_pick_enter");

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
    if (!this.theme.darkMode) {
      this.titleBar.setForegroundMode(TitleBarForegroundMode.DARK);
    } else {
      this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
    }

    this.setTitle();
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: "settings", iconPath: BuiltInIcon.SETTINGS });
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      this.uxService.onTitleBarItemClicked(icon);
    });

    void this.loadIdentities();

    void this.identityService.getSignedIdentity();
  }

  ionViewDidEnter() {
    // We are ready, we can hide the splash screen
    this.lottieSplashScreen.hide();
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  setTitle() {
    switch (this.globalNetworksService.activeNetworkTemplate.value) {
      case MAINNET_TEMPLATE:
        this.titleBar.setTitle(this.translate.instant("didsessions.pick-identity"));
        break;
      case TESTNET_TEMPLATE:
        this.titleBar.setTitle('TEST NET Active');
        break;
      case LRW_TEMPLATE:
        this.titleBar.setTitle('CR Private Net Active');
        break;
    }
  }

  async loadIdentities() {
    this.groupedIdentities = await this.identityService.loadGroupedIdentities();

    this.sortIdentities();

    this.changeDetector.detectChanges(); // Force angular to catch change in the array, in case of update
    Logger.log("didsessions", "Grouped identities:", this.groupedIdentities);

    if (this.availableIdentitiesCount() === 0) {
      // Maybe we've just deleted the last identity. Then go back to the identity creation screen
      void this.uxService.navigateRoot();
    }

    this.addAvatars();
  }

  /**
   * Sort identities by alphabetical order
   */
  private sortIdentities() {
    for (let groupedIdentity of this.groupedIdentities) {
      // Inside grouped identities, sort entries
      groupedIdentity.entries.sort((i1, i2) => {
        return i1.name.localeCompare(i2.name);
      });
    }

    // Take the first identity of each group and sort with order first identities of each group
    // Assume each group as at least one identity.
    this.groupedIdentities.sort((i1, i2) => {
      return i1.entries[0].name.localeCompare(i2.entries[0].name);
    });
  }

  addAvatars() {
    this.groupedIdentities.map((group) => {
      group.entries.forEach((entry) => {
        Logger.log('didsessions', 'Identity', entry);
      });
    })
  }

  async signIn(identityEntry: IdentityEntry) {
    Logger.log('didsessions', "Trying to sign in with DID " + identityEntry.didString);
    await this.nativeService.showLoading(this.translate.instant("didsessions.prepare.sign-in-title"));
    try {
      await this.identityService.signIn(identityEntry, true);
    } catch (e) {
      Logger.error('didsessions', "Sign exception:", e);
    }
    Logger.log('didsessions', "Sign in complete");
    await this.nativeService.hideLoading();
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

  public showOptions(ev: any, identityEntry: IdentityEntry) {
    void this.uxService.showOptions(ev, identityEntry);
  }
}
