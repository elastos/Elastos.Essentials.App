import { Component, OnInit, NgZone, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';

import { NavController } from '@ionic/angular';
import { Clipboard } from '@ionic-native/clipboard/ngx';

import * as moment from 'moment';

import { FriendsService } from '../../services/friends.service';
import { NativeService } from '../../services/native.service';
import { UxService } from '../../services/ux.service';
import { DidService } from '../../services/did.service';
import { AppService } from '../../services/app.service';
import { PopupService } from '../../services/popup.service';

import { Contact } from '../../models/contact.model';
import { DApp } from '../../models/dapp.model';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarIconSlot, BuiltInIcon, TitleBarNavigationMode, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Logger } from 'src/app/logger';


type DisplayableAppInfo = {
  packageId: string,
  app: DApp,
  action: string,
  isInstalled: boolean
}

@Component({
  selector: 'app-friend-details',
  templateUrl: './friend-details.page.html',
  styleUrls: ['./friend-details.page.scss'],
})
export class FriendDetailsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public contact: Contact;
  public contactsApps: DisplayableAppInfo[] = [];
  public fetchingApps = false;
  public detailsActive = true;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public friendsService: FriendsService,
    public uxService: UxService,
    public didService: DidService,
    public appService: AppService,
    public popupService: PopupService,
    private native: NativeService,
    private route: ActivatedRoute,
    private zone: NgZone,
    private navCtrl: NavController,
    private http: HttpClient,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    private clipboard: Clipboard,
    private globalIntentService: GlobalIntentService,
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(paramMap => {
      if (!paramMap.has('friendId')) {
        this.navCtrl.navigateBack('/friends');
        return;
      }

      const targetContact = this.friendsService.getContact(paramMap.get('friendId'));
      this.friendsService.contacts.map((contact) => {
        if(contact.id === targetContact.id) {
          this.contact = contact;
        }
      });

      Logger.log('contacts', 'Contact profile for', this.contact);
      this.buildDisplayableAppsInfo();
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('contact-profile'));
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, null);
    this.titleBar.setNavigationMode(TitleBarNavigationMode.CUSTOM, { key: 'backToHome', iconPath: BuiltInIcon.BACK } );
    this.titleBar.addOnItemClickedListener((icon) => {
      this.appService.onTitleBarItemClicked(icon);
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  changeList(activateDetails: boolean) {
    this.zone.run(() => {
      this.detailsActive = activateDetails;
    });
  }

  /* From the app credentials, build a list of displayable items onced its fetched from the app store */
  private async buildDisplayableAppsInfo() {
    this.contactsApps = [];

    if (this.contact.credentials.applicationProfileCredentials.length > 0) {
      Logger.log('contacts', 'Contact\'s app creds ', this.contact.credentials.applicationProfileCredentials);

      let fetchCount = this.contact.credentials.applicationProfileCredentials.length;
      this.fetchingApps = true;
      this.contact.credentials.applicationProfileCredentials.forEach((apc)=>{
        this.http.get<DApp>('https://dapp-store.elastos.org/apps/' + apc.apppackage + '/manifest').subscribe((manifest: DApp) => {
          Logger.log('contacts', 'Got app!', manifest);
          this.zone.run(async () => {
            this.contactsApps.push({
              packageId: apc.apppackage,
              app: manifest,
              action: apc.action ? apc.action : manifest.short_description,
              isInstalled: false // TODO @chad await this.appService.appIsInstalled(apc.apppackage)
            });

            fetchCount--;
            if (fetchCount == 0)
              this.fetchingApps = false;
          });
        }, (err) => {
          Logger.log('contacts', "HTTP ERROR " + JSON.stringify(err));
          this.zone.run(async () => {
            this.contactsApps.push({
              packageId: apc.apppackage,
              app: null,
              action: apc.action ? apc.action : null,
              isInstalled: false // TODO @chad await this.appService.appIsInstalled(apc.apppackage)
            });

            fetchCount--;
            if (fetchCount == 0)
              this.fetchingApps = false;
          });
        });
        Logger.log('contacts', 'Updated apps for contact profile', this.contactsApps);
      });
    }
    else {
      Logger.log('contacts', "No application profile credential found in this contact's profile.");
    }
  }

  getAppIcon(appId: string) {
    return "https://dapp-store.elastos.org/apps/" +appId+ "/icon";
  }

  fixBirthDate(birth) {
    return moment(birth).format("MMMM Do YYYY");
  }

  // Find app in marketplace, if marketplace is not installed, automatically install app //
  discoverApp(appId: string) {
    /* TODO - remove? Logger.log('contacts', 'Inquiring app in app-store..', appId);
    this.globalIntentService.sendIntent("appdetails", appId, {}, (res) => {
      Logger.log('contacts', res)
    }, (err) => {
      Logger.error('contacts', err);
      this.globalIntentService.sendIntent(
        "app",
        { id: appId },
        {}
      );
    });*/
  }

  // If app is installed, connect app to identity demo, if identity demo is not installed, open app instead  //
  connectApp(appId: string) {
    const targetAppCred = this.contact.credentials.applicationProfileCredentials.find((appCred) => appCred.apppackage === appId);
    if(targetAppCred) {
      Logger.log('contacts', 'Launching appCred: ' + targetAppCred, 'appManifest: ', appId);

      let passedFields = {};
      for (let key of Object.keys(targetAppCred)) {
        // Don't pass specific keys to the receiving app.
        if (key === "action" || key === "apppackage" || key === "apptype")
          continue;

        passedFields[key] = targetAppCred[key];
      }

      Logger.log('contacts', "Passing fields to the connectapplicationprofile intent:", passedFields);

      /* TODO - Remove? this.globalIntentService.sendIntent(
        "connectapplicationprofile",
        passedFields,
        { appId: appId },
        () => {
        Logger.log('contacts', "connectapplicationprofile intent success");
      }, (err) => {
        this.appService.startApp(appId);
        Logger.error('contacts', "connectapplicationprofile intent error", err);
      });*/
    }
  }

  copyAddress(type: string, address: string) {
    this.clipboard.copy(address);
    this.native.genericToast(
      this.translate.instant(type) + this.translate.instant('copied-with-type')
    );
  }
}
