import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { IdentityService, IdentityGroup } from 'src/app/didSessions/services/identity.service';
import { UXService } from 'src/app/didSessions/services/ux.service';
import { ThemeService } from 'src/app/services/theme.service';
import { TranslateService } from '@ngx-translate/core';
import { Events } from 'src/app/didSessions/services/events.service';
import { PopupProvider } from 'src/app/didSessions/services/popup';
import { DIDSessionsService, IdentityEntry } from 'src/app/services/didsessions.service';

@Component({
  selector: 'page-pickidentity',
  templateUrl: 'pickidentity.html',
  styleUrls: ['./pickidentity.scss']
})
export class PickIdentityPage {

  groupedIdentities: IdentityGroup[] = [];

  popover: any = null;

  constructor(
    private platform: Platform,
    public navCtrl: NavController,
    public identityService: IdentityService,
    private changeDetector: ChangeDetectorRef,
    public uxService: UXService,
    public theme: ThemeService,
    public translate: TranslateService,
    private events: Events,
    public popupProvider: PopupProvider,
    private didSessions: DIDSessionsService
  ) {

      this.events.subscribe("identityadded", newIdentity => {
        console.log("PickIdentiy - Identity added, reloading content");
        this.loadIdentities();
      });

      this.events.subscribe("identityremoved", newIdentity => {
        console.log("PickIdentiy - Identity deleted, reloading content");
        this.loadIdentities();
      });
  }

  ionViewWillEnter() {
    // Update system status bar every time we re-enter this screen.
    /* TODO @chad
    titleBarManager.setTitle(this.translate.instant("pick-identity"));

    titleBarManager.setNavigationMode(TitleBarPlugin.TitleBarNavigationMode.CLOSE);
    titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.OUTER_RIGHT, {
      key: "language",
      iconPath: TitleBarPlugin.BuiltInIcon.EDIT
    });
    */

    this.uxService.setTitleBarBackKeyShown(false);

    this.loadIdentities();

    this.identityService.getSignedIdentity();
  }

  async loadIdentities() {
    this.groupedIdentities = await this.identityService.loadGroupedIdentities();
    this.changeDetector.detectChanges(); // Force angular to catch change in the array, in case of update
    console.log("Grouped identities:", this.groupedIdentities);

    if (this.availableIdentitiesCount() === 0) {
      // Maybe we've just deleted the last identity. Then go back to the identity creation screen
      this.uxService.navigateRoot();
    }

    this.addAvatars();
  }

  addAvatars() {
    this.groupedIdentities.map((group) => {
      group.entries.forEach((entry) => {
        console.log('Identity', entry);
      });
    })
  }

  async signIn(identityEntry: IdentityEntry) {
    console.log("Trying to sign in with DID "+identityEntry.didString);
    await this.identityService.signIn(identityEntry);
  }

  /**
   * Used to create a new DID inside a brand new DID store = new mnemonic.
   */
  createIdentity() {
    this.navCtrl.navigateForward("/createidentity");
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

  // Delete me
  signOutTest() {
    console.log("TEST - Signing out")
    this.didSessions.signOut();
  }

  async deleteAllTest() {
    let identities = await this.didSessions.getIdentityEntries();

    for (let identity of identities) {
      await this.didSessions.deleteIdentityEntry(identity.didString)
    }
  }

  availableIdentitiesCount(): Number {
    let count = 0;
    for (let group of this.groupedIdentities) {
      for (let identity of group.entries) {
        count++;
      }
    }
    return count;
  }
}
