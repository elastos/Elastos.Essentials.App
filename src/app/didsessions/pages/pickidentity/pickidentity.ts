import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { SplashScreen } from '@awesome-cordova-plugins/splash-screen/ngx';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarForegroundMode, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { IdentityGroup, IdentityService } from 'src/app/didsessions/services/identity.service';
import { PopupProvider } from 'src/app/didsessions/services/popup';
import { UXService } from 'src/app/didsessions/services/ux.service';
import { Logger } from 'src/app/logger';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { Events } from 'src/app/services/events.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNetworksService, MAINNET_TEMPLATE, TESTNET_TEMPLATE } from 'src/app/services/global.networks.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'page-pickidentity',
  templateUrl: 'pickidentity.html',
  styleUrls: ['./pickidentity.scss']
})
export class PickIdentityPage implements OnInit {
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
    private globalNetworksService: GlobalNetworksService,
    private didSessions: GlobalDIDSessionsService,
    private nativeService: GlobalNativeService,
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

  ngOnInit() {
    this.globalNetworksService.activeNetworkTemplate.subscribe(template => {
      switch (template) {
        case MAINNET_TEMPLATE:
          this.titleBar.setTitle(this.translate.instant("didsessions.pick-identity"));
          break;
        case TESTNET_TEMPLATE:
          this.titleBar.setTitle('TEST NET Active');
          break;
        case 'LRW':
          this.titleBar.setTitle('CR Private Net Active');
          break;
      }
    });
  }

  ionViewWillEnter() {
    if (!this.theme.darkMode) {
      this.titleBar.setTheme('#F5F5FD', TitleBarForegroundMode.DARK);
    } else {
      this.titleBar.setTheme('#121212', TitleBarForegroundMode.LIGHT);
    }

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
    Logger.log('didsessions', "Trying to sign in with DID " + identityEntry.didString);
    void this.nativeService.showLoading(this.translate.instant("didsessions.prepare.sign-in-title"));
    await this.identityService.signIn(identityEntry, true);
    Logger.log('didsessions', "Sign in complete");
    void this.nativeService.hideLoading();
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
