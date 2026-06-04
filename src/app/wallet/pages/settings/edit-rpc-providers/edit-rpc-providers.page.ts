import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import type { AnyNetwork } from 'src/app/wallet/model/networks/network';
import type { RPCUrlProvider } from 'src/app/wallet/model/rpc-url-provider';
import { BuiltinNetworkOverride, WalletNetworkService } from 'src/app/wallet/services/network.service';
import { RpcProvidersQualityService, RpcProviderStatus } from 'src/app/wallet/services/rpc-providers-quality.service';

export type EditRpcProvidersRoutingParams = {
  networkKey: string; // Key of the network whose RPC providers to edit
};

@Component({
  selector: 'app-edit-rpc-providers',
  templateUrl: './edit-rpc-providers.page.html',
  styleUrls: ['./edit-rpc-providers.page.scss']
})
export class EditRpcProvidersPage implements OnInit, OnDestroy {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  // Model
  public network: AnyNetwork = null;
  public networkOverride: BuiltinNetworkOverride = null;

  // RPC providers data
  public allRpcProviders: RPCUrlProvider[] = [];
  public selectedRpcUrl = '';
  private originalSelectedRpcUrl = ''; // Track the originally selected provider when entering the page

  // Quality monitoring
  public providersStatus = new Map<string, RpcProviderStatus>();

  constructor(
    public theme: GlobalThemeService,
    public translate: TranslateService,
    public networkService: WalletNetworkService,
    private router: Router,
    private native: GlobalNativeService,
    private globalNav: GlobalNavService,
    public globalPopupService: GlobalPopupService,
    private zone: NgZone,
    private alertCtrl: AlertController,
    private qualityService: RpcProvidersQualityService
  ) {}

  ngOnInit() {
    this.init();
  }

  ngOnDestroy() {
    // Stop quality monitoring when component is destroyed
    this.qualityService.stopMonitoring();
  }

  private init() {
    const navigation = this.router.getCurrentNavigation();
    this.zone.run(() => {
      const params = navigation.extras.state as EditRpcProvidersRoutingParams;

      // Get the network
      this.network = this.networkService.getNetworkByKey(params.networkKey);
      if (!this.network) {
        this.native.errToast('Network not found');
        void this.globalNav.navigateBack();
        return;
      }

      // Get existing override or create empty one
      this.networkOverride = this.networkService.getBuiltinNetworkOverride(params.networkKey) || {
        networkKey: params.networkKey
      };

      // Initialize RPC providers data
      this.allRpcProviders = this.network.getAllRpcProviders();
      // Use setTimeout to ensure the radio group binding updates properly
      setTimeout(() => {
        this.selectedRpcUrl = this.network.getSelectedRpcProvider().url;
        this.originalSelectedRpcUrl = this.selectedRpcUrl; // Remember the original selection
      }, 0);
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('wallet.edit-rpc-providers-title'));

    // Refresh the selected RPC provider in case it was changed elsewhere
    if (this.network) {
      // Use setTimeout to ensure the radio group binding updates properly
      setTimeout(() => {
        this.selectedRpcUrl = this.network.getSelectedRpcProvider().url;
      }, 0);
    }

    // Start quality monitoring
    this.qualityService.startMonitoring(this.allRpcProviders);

    // Subscribe to status updates
    this.qualityService.status$.subscribe(status => {
      this.zone.run(() => {
        this.providersStatus = status;
      });
    });
  }

  public isBuiltinProvider(provider: RPCUrlProvider): boolean {
    return this.network.rpcUrlProviders.some(builtin => builtin.url === provider.url);
  }

  public isSelectedProvider(provider: RPCUrlProvider): boolean {
    return provider.url === this.selectedRpcUrl;
  }

  public selectRpcProvider(provider: RPCUrlProvider): void {
    this.selectedRpcUrl = provider.url;
  }

  public async addRpcProvider(): Promise<void> {
    // Show prompt for name
    const name = await this.promptForInput(
      this.translate.instant('wallet.rpc-provider-name'),
      this.translate.instant('wallet.rpc-provider-name-placeholder'),
      'text'
    );

    if (!name || name.trim() === '') {
      return; // User cancelled or empty name
    }

    // Show prompt for URL
    const url = await this.promptForInput(
      this.translate.instant('wallet.rpc-provider-url'),
      this.translate.instant('wallet.rpc-provider-url-placeholder'),
      'url'
    );

    if (!url || url.trim() === '') {
      return; // User cancelled or empty URL
    }

    // Validate URL format
    try {
      new URL(url.trim());
    } catch (e) {
      this.native.errToast('wallet.invalid-rpc-url');
      return;
    }

    // Check if URL already exists
    if (this.allRpcProviders.some(p => p.url === url.trim())) {
      this.native.errToast('wallet.rpc-url-already-exists');
      return;
    }

    // Add the new provider
    const newProvider: RPCUrlProvider = {
      name: name.trim(),
      url: url.trim()
    };

    this.allRpcProviders.push(newProvider);

    // Immediately save the new custom RPC provider to persist the change
    void this.networkService.addCustomRpcUrl(this.network.key, newProvider);

    // Restart monitoring with updated provider list
    this.qualityService.startMonitoring(this.allRpcProviders);
  }

  private promptForInput(message: string, placeholder: string, inputType = 'text'): Promise<string | null> {
    return new Promise(resolve => {
      void this.alertCtrl
        .create({
          header: this.translate.instant('wallet.add-rpc-provider'),
          message,
          backdropDismiss: false,
          inputs: [
            {
              name: 'input',
              type: inputType as any,
              placeholder
            }
          ],
          buttons: [
            {
              text: this.translate.instant('common.cancel'),
              role: 'cancel',
              handler: () => {
                resolve(null);
              }
            },
            {
              text: this.translate.instant('common.ok'),
              handler: data => {
                resolve(data.input);
              }
            }
          ]
        })
        .then(alert => {
          void alert.present();
        });
    });
  }

  public async removeRpcProvider(provider: RPCUrlProvider): Promise<void> {
    // Don't allow removing built-in providers
    if (this.isBuiltinProvider(provider)) {
      this.native.errToast('wallet.cannot-remove-builtin-provider');
      return;
    }

    // Don't allow removing the originally selected provider (the one that was selected when entering this page)
    if (provider.url === this.originalSelectedRpcUrl) {
      this.native.errToast('wallet.cannot-remove-original-selected-provider');
      return;
    }

    // Don't allow removing if it would leave fewer than 1 provider
    const remainingProviders = this.allRpcProviders.filter(p => p.url !== provider.url);
    if (remainingProviders.length === 0) {
      this.native.errToast('wallet.cannot-remove-last-provider');
      return;
    }

    const confirmed = await this.globalPopupService.ionicConfirm(
      'wallet.remove-rpc-provider',
      this.translate.instant('wallet.confirm-remove-provider', { name: provider.name || provider.url })
    );

    if (!confirmed) return;

    this.allRpcProviders = this.allRpcProviders.filter(p => p.url !== provider.url);

    // Immediately remove the custom RPC provider to persist the change
    void this.networkService.removeCustomRpcUrl(this.network.key, provider.url);

    // Restart monitoring with updated provider list
    this.qualityService.startMonitoring(this.allRpcProviders);
  }

  public saveChanges(): void {
    // Check if selected RPC URL is still valid
    const selectedProvider = this.allRpcProviders.find(p => p.url === this.selectedRpcUrl);
    if (!selectedProvider) {
      this.native.errToast('wallet.selected-rpc-provider-not-found');
      return;
    }

    // Save the selected RPC URL
    void this.networkService.setSelectedRpcUrl(this.network.key, this.selectedRpcUrl);

    // Navigate back
    void this.globalNav.navigateBack();
  }

  public cancel(): void {
    void this.globalNav.navigateBack();
  }

  public trackByUrl(index: number, provider: RPCUrlProvider): string {
    return provider.url;
  }

  /**
   * Get quality status for a provider
   */
  public getProviderStatus(provider: RPCUrlProvider): RpcProviderStatus | undefined {
    return this.providersStatus.get(provider.url);
  }

  /**
   * Get status icon for a provider
   */
  public getStatusIcon(provider: RPCUrlProvider): string {
    const status = this.getProviderStatus(provider);
    if (!status) return 'help-circle';
    return this.qualityService.getStatusIcon(status.status);
  }

  /**
   * Get status color class for a provider
   */
  public getStatusColorClass(provider: RPCUrlProvider): string {
    const status = this.getProviderStatus(provider);
    if (!status) return 'status-unknown';
    return this.qualityService.getStatusColorClass(status.status);
  }

  /**
   * Format ping time for display
   */
  public formatPingTime(provider: RPCUrlProvider): string {
    const status = this.getProviderStatus(provider);
    if (!status) return 'Unavailable';
    return this.qualityService.formatPingTime(status.pingTime);
  }
}
