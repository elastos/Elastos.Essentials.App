import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { AddEthereumChainParameter } from 'src/app/model/ethereum/requestparams';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNetworksService } from 'src/app/services/global.networks.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { CustomNetworkService } from 'src/app/wallet/services/evm/customnetwork.service';
import { CustomNetworkDiskEntry, WalletNetworkService } from 'src/app/wallet/services/network.service';
import { PopupProvider } from 'src/app/wallet/services/popup.service';

export type EditCustomNetworkRoutingParams = {
  forEdition: boolean;
  intentMode: boolean;
  intentId?: number; // Received intent id - for intent mode only
  customNetworkKey?: string; // Key of the edited network. Edition mode only
  preFilledRequest?: AddEthereumChainParameter; // Request to add a new network by an external api with prefilled information (intent mode)
}

export type EditCustomNetworkIntentResult = {
  networkAdded: boolean;
  networkKey?: string;
}

@Component({
  selector: 'app-edit-custom-network',
  templateUrl: './edit-custom-network.page.html',
  styleUrls: ['./edit-custom-network.page.scss'],
})
export class EditCustomNetworkPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  // Model
  public editedNetworkEntry: CustomNetworkDiskEntry = null;

  // Logic
  public editionMode = false;
  public intentMode = false;
  public intentId: number;

  constructor(
    public theme: GlobalThemeService,
    public translate: TranslateService,
    public networkService: WalletNetworkService,
    private globalNetworksService: GlobalNetworksService,
    private customNetworksService: CustomNetworkService,
    private router: Router,
    private globalIntentService: GlobalIntentService,
    private native: GlobalNativeService,
    private globalNav: GlobalNavService,
    private http: HttpClient,
    private popup: PopupProvider,
    private zone: NgZone
  ) { }

  ngOnInit() {
    this.init();
  }

  private init() {
    const navigation = this.router.getCurrentNavigation();
    this.zone.run(() => {
      let params = navigation.extras.state as EditCustomNetworkRoutingParams;
      if (params.forEdition) {
        this.editionMode = true;

        this.editedNetworkEntry = Object.assign({}, this.customNetworksService.getCustomNetworkEntries().find(n => n.key === navigation.extras.state.customNetworkKey));

        //this.editedNetworkEntry.rpcUrl = "https://http-mainnet.hecochain.com" // TMP TEST
        //this.editedNetworkEntry.accountRpcUrl = "https://api.hecoinfo.com" // TMP TEST

        return;
      }
      else {
        this.editionMode = false;
        this.intentMode = params.intentMode;

        if (!params.intentMode) {
          // User mode, start with blank inputs
          this.editedNetworkEntry = {
            key: "custom" + Date.now(),
            name: "",
            rpcUrl: "",
            accountRpcUrl: "",
            chainId: "",
            networkTemplate: this.globalNetworksService.activeNetworkTemplate.value,
            mainCurrencySymbol: "",
            colorScheme: '#9A67EB'
          };
        }
        else {
          // Intent mode - use prefilled data
          this.intentId = params.intentId;
          this.editedNetworkEntry = {
            key: "custom" + Date.now(),
            name: params.preFilledRequest.chainName,
            rpcUrl: params.preFilledRequest.rpcUrls[0],
            accountRpcUrl: "",
            chainId: "" + parseInt(params.preFilledRequest.chainId), // Possiblity convert from hex before converting back to string
            networkTemplate: this.globalNetworksService.activeNetworkTemplate.value,
            mainCurrencySymbol: params.preFilledRequest.nativeCurrency.symbol,
            colorScheme: '#9A67EB'
          };
        }
      }
      //this.editedNetworkEntry.rpcUrl = "https://http-mainnet.hecochain.com" // TMP TEST
      //this.editedNetworkEntry.accountRpcUrl = "https://api.hecoinfo.com" // TMP TEST
    });
  }

  ionViewWillEnter() {
    if (this.editionMode)
      this.titleBar.setTitle(this.translate.instant('wallet.add-custom-network-title'));
    else
      this.titleBar.setTitle(this.translate.instant('wallet.edit-custom-network-title'));
  }

  cancel() {
    if (this.intentMode) {
      let result: EditCustomNetworkIntentResult = {
        networkAdded: false
      };
      void this.globalIntentService.sendIntentResponse(result, this.intentId);
    }
    else {
      void this.globalNav.navigateBack();
    }
  }

  async delete(): Promise<void> {
    if (this.customNetworksService.customNetworkIsActiveNetwork(this.editedNetworkEntry)) {
      this.native.genericToast("wallet.cant-delete-active-network");
    }
    else {
      let deletionConfirmation = await this.popup.ionicConfirm("wallet.delete-network-prompt-title", "wallet.delete-network-prompt-text");
      if (!deletionConfirmation)
        return;

      await this.customNetworksService.deleteCustomNetwork(this.editedNetworkEntry);
      void this.globalNav.navigateBack();
    }
  }

  public canSave(): boolean {
    return this.editedNetworkEntry.name !== "" && this.editedNetworkEntry.rpcUrl != "" && this.editedNetworkEntry.chainId !== "";
  }

  public async saveChanges(): Promise<void> {
    // First, check that the RPC URL is accessible
    let rpcUrlIsReachable = false;
    try {
      await this.native.showLoading("wallet.checking-rpc-url");

      const httpOptions = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
        })
      };

      // Some servers return "{}" when the request body is "{}".
      // So it is better to call eth_blockNumber.
      let testCallResult = await this.http.post(this.editedNetworkEntry.rpcUrl, JSON.stringify({ "method": "eth_blockNumber", "jsonrpc": "2.0", "id": "test01" }), httpOptions).toPromise();
      if (testCallResult && "jsonrpc" in testCallResult)
        rpcUrlIsReachable = true;
    }
    catch (err) {
    }
    finally {
      await this.native.hideLoading();
    }

    if (!rpcUrlIsReachable) {
      this.native.errToast("wallet.wrong-rpc-url");
      return;
    }

    // Next, if there is a account url (optional), check it too
    if (this.editedNetworkEntry.accountRpcUrl && this.editedNetworkEntry.accountRpcUrl !== "") {
      let accountRpcUrlIsReachable = false;
      try {
        await this.native.showLoading("wallet.checking-account-rpc-url");

        const httpOptions = {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
          })
        };

        let testCallResult = await this.http.post(this.editedNetworkEntry.accountRpcUrl, JSON.stringify({}), httpOptions).toPromise();
        if (testCallResult && "status" in testCallResult)
          accountRpcUrlIsReachable = true;
      }
      catch (err) {
      }
      finally {
        await this.native.hideLoading();
      }

      if (!accountRpcUrlIsReachable) {
        this.native.errToast("wallet.wrong-account-rpc-url");
        return;
      }
    }

    // Everything ok, save the network
    await this.customNetworksService.upsertCustomNetwork(this.editedNetworkEntry);

    if (this.intentMode) {
      let result: EditCustomNetworkIntentResult = {
        networkAdded: true,
        networkKey: this.editedNetworkEntry.key
      };
      void this.globalIntentService.sendIntentResponse(result, this.intentId);
    }
    else {
      void this.globalNav.navigateBack();
    }
  }
}
