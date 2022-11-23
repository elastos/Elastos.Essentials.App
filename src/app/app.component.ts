import { Component, ViewChild } from '@angular/core';
import { FirebaseX } from "@awesome-cordova-plugins/firebase-x/ngx";
import { ScreenOrientation } from '@awesome-cordova-plugins/screen-orientation/ngx';
import { StatusBar } from '@awesome-cordova-plugins/status-bar/ngx';
import { connectivity } from '@elastosfoundation/elastos-connectivity-sdk-js';
import { IonRouterOutlet, Platform } from '@ionic/angular';
import { GlobalConfig } from './config/globalconfig';
import { ElastosSDKHelper } from './helpers/elastossdk.helper';
import { Logger } from './logger';
import { InternalElastosConnector } from './model/internalelastosconnector';
import { GlobalCredentialToolboxService } from './services/credential-toolbox/global.credential-toolbox.service';
import { GlobalCredentialTypesService } from './services/credential-types/global.credential.types.service';
import { GlobalAppBackgroundService } from './services/global.appbackground.service';
import { GlobalBTCRPCService } from './services/global.btc.service';
import { GlobalDIDSessionsService } from './services/global.didsessions.service';
import { GlobalELAUtxoService } from './services/global.ela.utxo.service';
import { GlobalElastosAPIService } from './services/global.elastosapi.service';
import { GlobalEthereumRPCService } from './services/global.ethereum.service';
import { GlobalFirebaseService } from './services/global.firebase.service';
import { GlobalHiveService } from './services/global.hive.service';
import { GlobalIntentService } from './services/global.intent.service';
import { GlobalLanguageService } from './services/global.language.service';
import { GlobalNativeService } from './services/global.native.service';
import { GlobalNavService } from './services/global.nav.service';
import { GlobalNetworksService } from './services/global.networks.service';
import { GlobalNotificationsService } from './services/global.notifications.service';
import { GlobalPreferencesService } from './services/global.preferences.service';
import { GlobalPublicationService } from './services/global.publication.service';
import { GlobalSecurityService } from './services/global.security.service';
import { GlobalStartupService } from './services/global.startup.service';
import { GlobalStorageService } from './services/global.storage.service';
import { GlobalThemeService } from './services/theming/global.theme.service';
import { GlobalWalletConnectService } from './services/walletconnect/global.walletconnect.service';


declare let didManager: DIDPlugin.DIDManager;

@Component({
  selector: 'app-root',
  template: '<ion-app><ion-router-outlet [swipeGesture]="false"></ion-router-outlet></ion-app>',
  // BPI 20200322: With the onpush detection strategy angular seems to work 5 to 10x faster for rendering
  // But this created some refresh bugs in some components, as we need to manually push more changes
  // To be continued. NOTE: Comment out the line below if too many problems for now!
  //changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  @ViewChild(IonRouterOutlet, { static: true }) routerOutlet: IonRouterOutlet;

  constructor(
    private platform: Platform,
    private statusBar: StatusBar,
    public storage: GlobalStorageService,
    public theme: GlobalThemeService,
    private globalNav: GlobalNavService,
    private didSessions: GlobalDIDSessionsService,
    private globalAppBackgroundService: GlobalAppBackgroundService,
    private language: GlobalLanguageService,
    private intentService: GlobalIntentService,
    private screenOrientation: ScreenOrientation,
    private notificationsService: GlobalNotificationsService,
    private publicationService: GlobalPublicationService,
    private globalPreferencesService: GlobalPreferencesService, // IMPORTANT: Unused by this component, but keep it here for instantiation by angular
    private globalHiveService: GlobalHiveService,
    private walletConnect: GlobalWalletConnectService,
    private globalFirebaseService: GlobalFirebaseService,
    private globalNetworksService: GlobalNetworksService,
    private globalElastosAPIService: GlobalElastosAPIService,
    private globalStartupService: GlobalStartupService,
    public globalEthereumService: GlobalEthereumRPCService, // IMPORTANT: Unused by this component, but keep it here for instantiation by angular
    public globalBTCService: GlobalBTCRPCService, // IMPORTANT: Unused by this component, but keep it here for instantiation by angular
    private credentialTypesService: GlobalCredentialTypesService,
    private credentialToolboxService: GlobalCredentialToolboxService,
    private globalSecurityService: GlobalSecurityService,
    private globalELAUtxoService: GlobalELAUtxoService,
    private globalNativeService: GlobalNativeService, // IMPORTANT: Unused by this component, but keep it here for instantiation by angular
    private firebase: FirebaseX
  ) { }

  ngOnInit() {
    this.initializeApp();
  }

  initializeApp() {
    void this.platform.ready().then(async () => {
      Logger.log("Global", "Main app component initialization is starting");

      this.globalStartupService.init();

      // Force Essentials orientation to portrait only
      void this.screenOrientation.lock("portrait");

      // Must do it in ios, otherwise the titlebar and status bar will overlap.
      this.statusBar.overlaysWebView(false);
      this.statusBar.backgroundColorByHexString("#ff000000");

      // Initialize our connectivity SDK helper (customize the connectivity SDK logger, storage layers)
      ElastosSDKHelper.init();

      // Use our own internal connector for the connectivity SDK
      let internalConnector = new InternalElastosConnector();
      await connectivity.registerConnector(new InternalElastosConnector());
      await connectivity.setActiveConnector(internalConnector.name);

      // Register Essentials' App DID to the connectivity SDK - For hive authentication flows.
      connectivity.setApplicationDID(GlobalConfig.ESSENTIALS_APP_DID);

      // Catch android back key for navigation
      this.setupBackKeyNavigation();

      // Initialize mandatory services
      this.theme.init();
      await this.language.init();
      await this.globalNetworksService.init();
      await this.globalElastosAPIService.init();
      await this.notificationsService.init();
      await this.intentService.init();
      await this.publicationService.init();
      await this.walletConnect.init();
      await this.globalHiveService.init();
      await this.credentialTypesService.init();
      await this.credentialToolboxService.init();
      void this.globalFirebaseService.init();
      void this.globalELAUtxoService.init();
      // Init after globalNetworksService.init()
      void this.globalBTCService.init();

      // "DApps" initializations
      await this.globalAppBackgroundService.init();

      Logger.log("Global", "All awaited init services have been initialized");

      // This method WILL SIGN IN (if there is a previously signed in DID), so it must come last.
      await this.didSessions.init();

      await this.globalStartupService.navigateToFirstScreen();

      // Now that all services are initialized and the initial screen is shown,
      // we can start listening to external intents.
      // All the subscribers may now be listening to received intents
      await this.intentService.listen();
    });
  }

  /**
   * Listen to back key events. If the default router can go back, just go back.
   * Otherwise, exit the application.
   */
  setupBackKeyNavigation() {
    this.platform.backButton.subscribeWithPriority(0, () => {
      if (this.globalNav.canGoBack()) {
        void this.globalNav.navigateBack();
      } else {
        navigator["app"].exitApp();
      }
    });
  }
}
