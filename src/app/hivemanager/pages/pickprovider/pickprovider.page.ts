import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { connectivity } from '@elastosfoundation/elastos-connectivity-sdk-js';
import { Order, VaultInfo } from '@elastosfoundation/hive-js-sdk';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { ProfileService } from 'src/app/identity/services/profile.service';
import { Logger } from 'src/app/logger';
import { App } from "src/app/model/app.enum";
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalHiveService, VaultStatus } from 'src/app/services/global.hive.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNetworksService, MAINNET_TEMPLATE, TESTNET_TEMPLATE } from 'src/app/services/global.networks.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { HiveService, PaidIncompleteOrder } from '../../services/hive.service';
import { DIDSessionsStore } from './../../../services/stores/didsessions.store';

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
  public vaultLinkStatus: VaultStatus = null;
  private forceProviderChange = false;
  private developerMode = false;
  public manualProviderAddress: string = null;
  public fetchingActivePaymentPlan = true;
  public activePaymentPlan: VaultInfo = null;
  public fetchingOrdersAwaitingTxConfirmation = true;
  public ordersAwaitingTxConfirmation: Order[] = [];
  public incompleteOrders: PaidIncompleteOrder[] = []; // Orders paid but not notified to the hive node (payOrder() failed).
  public publishingProvider = false;

  // Hardcoded list of suggested providers for now
  public storageProviders: StorageProvider[] = [];

  private vaultStatusSubscription: Subscription = null;
  private eventSubscription: Subscription = null;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public zone: NgZone,
    public alertController: AlertController,
    private translate: TranslateService,
    public hiveService: HiveService,
    private route: ActivatedRoute,
    public theme: GlobalThemeService,
    private nav: GlobalNavService,
    private globalPopupService: GlobalPopupService,
    private prefs: GlobalPreferencesService,
    private events: GlobalEvents,
    private native: GlobalNativeService,
    public profileService: ProfileService,
    private globalNetworksService: GlobalNetworksService,
    private globalHiveService: GlobalHiveService
  ) { }

  async ngOnInit() {
    // Adapt the proposed default hive nodes to the selected network in settings.
    let networkTemplate = await this.globalNetworksService.getActiveNetworkTemplate();
    if (networkTemplate == MAINNET_TEMPLATE) {
      this.storageProviders = [
        { name: 'Elastos.io 1', vaultAddress: "https://hive1.elastos.io" },
        { name: 'Elastos.io 2', vaultAddress: "https://hive2.elastos.io" },
        { name: 'Elastos.io 3', vaultAddress: "https://hive3.elastos.io" }
      ];
    }
    else if (networkTemplate == TESTNET_TEMPLATE) {
      this.storageProviders = [
        { name: 'Elastos Hive Testnet 1', vaultAddress: "https://hive-testnet1.elastos.io" },
        { name: 'Elastos Hive Testnet 2', vaultAddress: "https://hive-testnet2.elastos.io" }
      ];
    }
    else {
      this.storageProviders = [];
    }

    // this.route.queryParams.subscribe((data) => {
    //   //Logger.log("HiveManager", "QUERY PARAMS", data);
    // });

    this.eventSubscription = this.events.subscribe("plan-just-purchased", () => {
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

    this.developerMode = await this.prefs.developerModeEnabled(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate);

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


  ionViewDidEnter() {
    Logger.log("hivemanager", "Pick provider: subscribing to vault status events");
    this.vaultStatusSubscription = this.globalHiveService.vaultStatus.subscribe((status) => {
      void this.checkInitialStatus();
    })
  }

  ionViewWillLeave() {
    this.titleBar.setMenuVisibility(false);

    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);

    if (this.vaultStatusSubscription) {
      this.vaultStatusSubscription.unsubscribe();
      this.vaultStatusSubscription = null;
    }

    if (this.eventSubscription) {
      this.eventSubscription.unsubscribe()
      this.eventSubscription = null;
    }
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
         this.globalIntentService.sendIntent("https://did.web3essentials.io/promptpublishdid", null);
       }
       return;
     } */

    this.publishingProvider = true;
    let publicationStarted = await this.globalHiveService.publishVaultProvider(providerName, providerAddress);
    this.publishingProvider = false;

    // Refresh the link status
    this.vaultLinkStatus = await this.globalHiveService.vaultStatus.value;
    Logger.log("HiveManager", "Vault link status:", this.vaultLinkStatus);

    this.forceProviderChange = false;
  }

  private async fetchActivePaymentPlan() {
    if (await this.hiveService.getActiveVault()) {
      Logger.log("HiveManager", "Fetching active payment plan");

      this.activePaymentPlan = await this.hiveService.getActivePricingPlan();
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
    void this.globalPopupService.ionicAlert("hivemanager.alert.not-available", "hivemanager.alert.not-available-msg", "common.understood");
  }

  private async revokeHiveAuthToken() {
    Logger.log("HiveManager", "Revoking main user vault authentication token");
    // Revoke the vualt auth token
    (await this.globalHiveService.getActiveUserVaultServices()).getServiceContext().getAccessToken().invalidate();
    // Also remove the app instance DID because it contains data (app did) we may want to renew.
    // Setting the active connector to null will clenaup its context, including the app instance DID.
    await connectivity.setActiveConnector(null);
    this.native.genericToast("hivemanager.token-revoked");
  }
}
