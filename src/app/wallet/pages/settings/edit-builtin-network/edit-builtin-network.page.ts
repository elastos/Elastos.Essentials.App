import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import type { AnyNetwork } from 'src/app/wallet/model/networks/network';
import type { RPCUrlProvider } from 'src/app/wallet/model/rpc-url-provider';
import { EVMService } from 'src/app/wallet/services/evm/evm.service';
import { Native } from 'src/app/wallet/services/native.service';
import { BuiltinNetworkOverride, WalletNetworkService } from 'src/app/wallet/services/network.service';
import { RpcProvidersQualityService, RpcProviderStatus } from 'src/app/wallet/services/rpc-providers-quality.service';

export type EditBuiltinNetworkRoutingParams = {
  networkKey: string; // Key of the builtin network to edit
};

@Component({
  selector: 'app-edit-builtin-network',
  templateUrl: './edit-builtin-network.page.html',
  styleUrls: ['./edit-builtin-network.page.scss']
})
export class EditBuiltinNetworkPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  // Model
  public network: AnyNetwork = null;
  public networkOverride: BuiltinNetworkOverride = null;

  // Edited values (bound to UI)
  public editedName = '';
  public allRpcProviders: RPCUrlProvider[] = [];
  public selectedRpcUrl = '';
  public isNetworkVisible = false;

  // Original values (for change detection)
  private originalSelectedRpcUrl = '';

  // Quality monitoring
  public providersStatus = new Map<string, RpcProviderStatus>();

  constructor(
    public theme: GlobalThemeService,
    public translate: TranslateService,
    public networkService: WalletNetworkService,
    private router: Router,
    private native: GlobalNativeService,
    private navNative: Native,
    private globalNav: GlobalNavService,
    private http: HttpClient,
    public globalPopupService: GlobalPopupService,
    private zone: NgZone,
    private qualityService: RpcProvidersQualityService
  ) {}

  ngOnInit() {
    this.init();
  }

  ngOnDestroy() {
    // Stop quality monitoring when component is destroyed
    this.qualityService.stopMonitoring();
    void this.native.hideLoading(); // Maybe RPC request timeout
  }

  private init() {
    const navigation = this.router.getCurrentNavigation();
    this.zone.run(() => {
      const params = navigation.extras.state as EditBuiltinNetworkRoutingParams;

      // Get the builtin network
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

      // Initialize edited values with current effective values
      this.editedName = this.network.getEffectiveName();
      this.allRpcProviders = this.network.getAllRpcProviders();
      this.selectedRpcUrl = this.network.getSelectedRpcProvider().url;
      this.originalSelectedRpcUrl = this.selectedRpcUrl; // Remember original value for change detection
      this.isNetworkVisible = this.networkService.getNetworkVisible(this.network.key);
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('wallet.edit-builtin-network-title'));

    // Refresh the selected RPC provider and RPC providers list in case they were changed in the edit-rpc-providers page
    if (this.network) {
      this.selectedRpcUrl = this.network.getSelectedRpcProvider().url;
      this.allRpcProviders = this.network.getAllRpcProviders();
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

  cancel() {
    void this.globalNav.navigateBack();
  }

  public canSave(): boolean {
    return this.editedName.trim() !== '' && this.selectedRpcUrl.trim() !== '';
  }

  public async saveChanges(): Promise<void> {
    // First, check that the selected RPC URL is accessible
    let rpcUrlIsReachable = false;
    try {
      await this.native.showLoading('wallet.checking-rpc-url');

      const httpOptions = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json'
        })
      };

      // Some servers return "{}" when the request body is "{}".
      // So it is better to call eth_blockNumber.
      let testCallResult = await this.http
        .post(
          this.selectedRpcUrl,
          JSON.stringify({ method: 'eth_blockNumber', jsonrpc: '2.0', id: 'test01' }),
          httpOptions
        )
        .toPromise();
      if (testCallResult && 'jsonrpc' in testCallResult) rpcUrlIsReachable = true;
    } catch (err) {
    } finally {
      await this.native.hideLoading();
    }

    if (!rpcUrlIsReachable) {
      this.native.errToast('wallet.wrong-rpc-url');
      return;
    }

    // Check if values have changed from defaults
    const defaultName = this.network.getDefaultName();
    const currentSelectedRpcUrl = this.network.getSelectedRpcProvider().url;
    const currentVisibility = this.networkService.getNetworkVisible(this.network.key);

    const nameChanged = this.editedName.trim() !== defaultName;
    const selectedRpcUrlChanged = this.originalSelectedRpcUrl.trim() !== currentSelectedRpcUrl;
    const visibilityChanged = this.isNetworkVisible !== currentVisibility;

    // Get custom RPC providers (those not in the built-in list)
    const customRpcProviders = this.allRpcProviders.filter(
      provider => !this.network.rpcUrlProviders.some(builtin => builtin.url === provider.url)
    );

    // Save changes
    if (nameChanged || selectedRpcUrlChanged || customRpcProviders.length > 0) {
      // if the RPC URL changed and the network is an EVM network, then clear the Web3 cache
      if (
        selectedRpcUrlChanged &&
        this.network.isEVMNetwork() &&
        this.networkService.activeNetwork.value?.key === this.network.key
      ) {
        EVMService.instance.clearWeb3Cache();
      }

      // Save the override
      const override: BuiltinNetworkOverride = {
        networkKey: this.network.key,
        selectedRpcUrl: this.selectedRpcUrl.trim(),
        ...(nameChanged && { name: this.editedName.trim() }),
        ...(customRpcProviders.length > 0 && { customRpcUrls: customRpcProviders })
      };
      await this.networkService.setBuiltinNetworkOverride(this.network.key, override);
    } else {
      // Remove any existing override since values match defaults
      const firstRpcUrl = this.allRpcProviders[0]?.url;
      if (currentSelectedRpcUrl === firstRpcUrl) {
        await this.networkService.removeBuiltinNetworkOverride(this.network.key);
      }
    }

    // Save visibility setting
    if (visibilityChanged) {
      await this.networkService.setNetworkVisible(this.network.key, this.isNetworkVisible);
    }

    void this.globalNav.navigateBack();
  }

  public hasNameOverride(): boolean {
    return this.network && this.editedName.trim() !== this.network.getEffectiveName();
  }

  public resetName(): void {
    if (this.network) {
      this.editedName = this.network.getDefaultName();
    }
  }

  public isBuiltinProvider(provider: RPCUrlProvider): boolean {
    return this.network.rpcUrlProviders.some(builtin => builtin.url === provider.url);
  }

  public getChainId(): string {
    if (!this.network) {
      return 'N/A';
    }

    if (this.network.isEVMNetwork()) {
      return (this.network as any).getMainChainID()?.toString() || 'N/A';
    }
    return 'N/A';
  }

  public getSelectedRpcProvider(): RPCUrlProvider | null {
    if (!this.network || !this.selectedRpcUrl) {
      return null;
    }
    return this.network.getAllRpcProviders().find(provider => provider.url === this.selectedRpcUrl) || null;
  }

  public editRpcProviders(): void {
    this.navNative.go('/wallet/settings/edit-rpc-providers', {
      networkKey: this.network.key
    });
  }

  public onVisibilityChange(event: CustomEvent): void {
    this.isNetworkVisible = event.detail.checked;
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
