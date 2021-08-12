import { Component, OnInit, ViewChild } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { NgZone} from '@angular/core';
import { HiveService, PaidIncompleteOrder } from '../../services/hive.service';
import { ActivatedRoute } from '@angular/router';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { PopupService } from '../../services/popup.service';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarMenuItem, BuiltInIcon, TitleBarIcon } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { Events } from 'src/app/services/events.service';
import { ProfileService } from 'src/app/identity/services/profile.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { App } from "src/app/model/app.enum"
import { GlobalHiveService, VaultLinkStatus } from 'src/app/services/global.hive.service';
import { GlobalNetworksService, MAINNET_TEMPLATE, TESTNET_TEMPLATE } from 'src/app/services/global.networks.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { connectivity } from "@elastosfoundation/elastos-connectivity-sdk-cordova";

declare let hiveManager: HivePlugin.HiveManager;

type StorageProvider = {
  name: string,
  vaultAddress: string
}

@Component({
  selector: 'app-pickprovider',
  templateUrl: './pickprovider.page.html',
  styleUrls: ['./pickprovider.page.scss'],
})
export class PickProviderPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public checkingInitialStatus = true;
  public vaultProviderCouldBeContacted = false;
  public vaultLinkStatus: VaultLinkStatus = null;
  private forceProviderChange = false;
  private developerMode = false;
  public manualProviderAddress: string = null;
  public fetchingActivePaymentPlan = true;
  public activePaymentPlan: HivePlugin.Payment.ActivePricingPlan = null;
  public fetchingOrdersAwaitingTxConfirmation = true;
  public ordersAwaitingTxConfirmation: HivePlugin.Payment.Order[] = [];
  public incompleteOrders: PaidIncompleteOrder[] = []; // Orders paid but not notified to the hive node (payOrder() failed).
  public publishingProvider = false;

  // Hardcoded list of suggested providers for now
  public storageProviders: StorageProvider[] = [];

  private menu: any;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public zone: NgZone,
    public alertController:AlertController,
    private translate: TranslateService,
    public hiveService: HiveService,
    private route: ActivatedRoute,
    public theme: GlobalThemeService,
    private nav: GlobalNavService,
    private popup: PopupService,
    private prefs: GlobalPreferencesService,
    private events: Events,
    private native: GlobalNativeService,
    public profileService: ProfileService,
    private globalNetworksService: GlobalNetworksService,
    private globalHiveService: GlobalHiveService
  ) {}

  async ngOnInit() {
    // Adapt the proposed default hive nodes to the selected network in settings.
    let networkTemplate = await this.globalNetworksService.getActiveNetworkTemplate();
    if (networkTemplate == MAINNET_TEMPLATE) {
      this.storageProviders =  [
        { name: 'Trinity-tech.io 1', vaultAddress: "https://hive1.trinity-tech.io" },
        { name: 'Trinity-tech.io 2', vaultAddress: "https://hive2.trinity-tech.io" },
        { name: 'Trinity-tech.cn 1', vaultAddress: "https://hive1.trinity-tech.cn" }
      ];
    }
    else if (networkTemplate == TESTNET_TEMPLATE) {
      this.storageProviders =  [
        { name: 'Trinity Tech Hive Testnet 1', vaultAddress: "https://hive-testnet1.trinity-tech.io" },
        { name: 'Trinity Tech Hive Testnet 2', vaultAddress: "https://hive-testnet2.trinity-tech.io" }
      ];
    }
    else {
      this.storageProviders = [];
    }

    this.route.queryParams.subscribe((data) => {
      //Logger.log("HiveManager", "QUERY PARAMS", data);
    });

    this.events.subscribe("plan-just-purchased", ()=>{
      Logger.log("HiveManager", "Payment just purchased. Refreshing status.");
      void this.checkInitialStatus();
    });
  }

  async ionViewWillEnter() {
    this.titleBar.setMenuVisibility(true);

    const menuItems: TitleBarMenuItem[] = [
      {
        title: this.translate.instant('hivemanager.hive-menu.vault-providers-administration'),
        key: "pickprovider-adminproviders",
        iconPath: BuiltInIcon.SETTINGS
      }
    ];

    this.developerMode = await this.prefs.developerModeEnabled(GlobalDIDSessionsService.signedInDIDString);

    if (this.developerMode) {
      // Add a special menu item to be able to switch to another vault without transfer
      menuItems.push({
        title: this.translate.instant('hivemanager.hive-menu.force-provider-change'),
        key: "pickprovider-forceproviderchange",
        iconPath: BuiltInIcon.EDIT
      });
      // Add a special menu item to be able to revoke the hive auth token for test purpose
      menuItems.push({
        title: this.translate.instant('hivemanager.hive-menu.revoke-auth-token'),
        key: "pickprovider-revokeauthtoken",
        iconPath: BuiltInIcon.DELETE
      });
    }

    this.titleBar.setupMenuItems(menuItems);

    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (clickedIcon: TitleBarMenuItem) => {
      switch (clickedIcon.key) {
        case "pickprovider-adminproviders":
          this.goToAdminPanel();
          break;
        case "pickprovider-forceproviderchange":
          Logger.log("HiveManager", "Forcing provider change");
          this.zone.run(() => {
            this.forceProviderChange = true;
            this.vaultProviderCouldBeContacted = true;
          });
          break;
        case "pickprovider-revokeauthtoken":
          void this.revokeHiveAuthToken();
          break;
      }
    });

    this.titleBar.setTitle(this.translate.instant('hivemanager.pickprovider.title'));
  }


  ionViewDidEnter(){
    Logger.log("hivemanager", "Pick provider: subscribing to vault status events");
    this.globalHiveService.vaultStatus.subscribe((status) => {
      void this.checkInitialStatus();
    })
  }

  ionViewWillLeave() {
    this.titleBar.setMenuVisibility(false);

    if (this.popup.alert) {
      void this.popup.alertCtrl.dismiss();
      this.popup.alert = null;
    }

    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  private checkInitialStatus() {
    // Reset all states
    this.vaultProviderCouldBeContacted = false;
    this.vaultLinkStatus = null;
    this.fetchingActivePaymentPlan = true;
    this.activePaymentPlan = null;
    this.fetchingOrdersAwaitingTxConfirmation = true;
    this.ordersAwaitingTxConfirmation = [];
    this.incompleteOrders = [];

    this.checkingInitialStatus = true;

    if (this.globalHiveService.vaultStatus.value) {
      try {
        this.vaultLinkStatus = this.globalHiveService.vaultStatus.value;
        this.vaultProviderCouldBeContacted = true;

        // Start those checks in background, not blocking.
        void Promise.race([
          this.hiveService.tryToFinalizePreviousOrders(),
          this.fetchActivePaymentPlan(),
          this.fetchOrdersAwaitingTxConfirmation(),
        ]);
      }
      catch (e) {
        Logger.warn("HiveManager", "Error while trying to retrieve vault link status: ", e);
        this.vaultProviderCouldBeContacted = false;
      }
    }
    else {
      Logger.warn("HiveManager", "Vault status could not be retrieved.");
      this.vaultProviderCouldBeContacted = false;
    }

    // Mark initial status check phase as completed
    this.checkingInitialStatus = false;
  }

  hasVaultProvider(): boolean {
    if (!this.vaultProviderCouldBeContacted || this.forceProviderChange)
      return false;

    return this.vaultLinkStatus != null && this.vaultLinkStatus.publishedInfo != null;
  }

  async pickProvider(provider: StorageProvider) {
    await this.publishProvider(provider.name, provider.vaultAddress);
  }

  async manuallySetProvider() {
    if (!this.manualProviderAddress || this.manualProviderAddress == "")
      return;

    await this.publishProvider("Custom vault provider", this.manualProviderAddress.toLowerCase());
  }

  private async publishProvider(providerName: string, providerAddress: string) {
    Logger.log("HiveManager", "Publishing vault provider", providerName, providerAddress);

   /*  let diddocment = await this.profileService.publishedDIDDocument;
    if (diddocment === null) {
      Logger.log('HiveManager', 'DID is not published!')
      let confirmed = await this.popup.ionicConfirm("hivemanager.alert.didpublish-title", "hivemanager.alert.didpublish-msg");
      if (confirmed) {
        this.globalIntentService.sendIntent("https://did.elastos.net/promptpublishdid", null);
      }
      return;
    } */

    this.publishingProvider = true;
    let publicationStarted = await this.globalHiveService.publishVaultProvider(providerName, providerAddress);

    this.publishingProvider = false;

    // Refresh the link status
    this.vaultLinkStatus = await this.globalHiveService.retrieveVaultLinkStatus();
    Logger.log("HiveManager", "Vault link status:", this.vaultLinkStatus)

    this.forceProviderChange = false;
  }

  private async fetchActivePaymentPlan() {
    if (await this.hiveService.getActiveVault()) {
      Logger.log("HiveManager", "Fetching active payment plan");

      // TODO: PERF improvement - getActivePricingPlan() is already called in retrieveVaultLinkStatus(), this is duplicate API call to remove.
      this.activePaymentPlan = await this.hiveService.getActiveVault().getPayment().getActivePricingPlan()
      Logger.log("HiveManager", "Got active payment plan:", this.activePaymentPlan);
    }

    this.fetchingActivePaymentPlan = false;
  }

  /**
   * Retrieves the list of orders paid by the user, for which the transactions have not been
   * confirmed by the vault provider yet.
   */
  private async fetchOrdersAwaitingTxConfirmation() {
    Logger.log("HiveManager", "Starting to fetch orders awaiting confirmation");

    if (await this.hiveService.getActiveVault()) {
      Logger.log("HiveManager", "Getting orders awaiting payment validation");
      this.ordersAwaitingTxConfirmation = await this.hiveService.getOrdersAwaitingPaymentValidation();
    }

    // Also fetch incomplete orders
    Logger.log("HiveManager", "Getting paid incomplete orders");
    this.incompleteOrders = await this.hiveService.getPaidIncompleteOrders();

    Logger.log("HiveManager", "Fetched orders awaiting tx confirmation");

    this.fetchingOrdersAwaitingTxConfirmation = false;
  }

  private goToAdminPanel() {
    void this.nav.navigateTo(App.HIVE_MANAGER, "hivemanager/adminproviderslist");
  }

  public changePlan() {
    void this.nav.navigateTo(App.HIVE_MANAGER, "hivemanager/pickplan");
  }

  public transferVault() {
    void this.popup.ionicAlert("hivemanager.alert.not-available", "hivemanager.alert.not-available-msg");
  }

  private async revokeHiveAuthToken() {
    Logger.log("HiveManager", "Revoking main user vault authentication token");
    // Revoke the vualt auth token
    await this.globalHiveService.getActiveVault().revokeAccessToken();
    // Also remove the app instance DID because it contains data (app did) we may want to renew.
    // Setting the active connector to null will clenaup its context, including the app instance DID.
    await connectivity.setActiveConnector(null);
    this.native.genericToast("hivemanager.token-revoked");
  }
}
