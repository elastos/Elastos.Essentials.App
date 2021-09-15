import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Util } from 'src/app/model/util';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNetworksService } from 'src/app/services/global.networks.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { CustomNetworkService } from 'src/app/wallet/services/customnetwork.service';
import { CustomNetworkDiskEntry, WalletNetworkService } from 'src/app/wallet/services/network.service';
import { PopupProvider } from 'src/app/wallet/services/popup.service';

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

  constructor(
    public theme: GlobalThemeService,
    public translate: TranslateService,
    public networkService: WalletNetworkService,
    private globalNetworksService: GlobalNetworksService,
    private customNetworksService: CustomNetworkService,
    private router: Router,
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
      if (!Util.isEmptyObject(navigation.extras.state)) {
        if (navigation.extras.state.customNetworkKey) {
          this.editionMode = true;

          this.editedNetworkEntry = Object.assign({}, this.customNetworksService.getCustomNetworkEntries().find(n => n.key === navigation.extras.state.customNetworkKey));

          //this.editedNetworkEntry.rpcUrl = "https://http-mainnet.hecochain.com" // TMP TEST
          //this.editedNetworkEntry.accountRpcUrl = "https://api.hecoinfo.com" // TMP TEST

          return;
        }
      }

      this.editionMode = false;
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
    void this.globalNav.navigateBack();
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

      let testCallResult = await this.http.post(this.editedNetworkEntry.rpcUrl, JSON.stringify({}), httpOptions).toPromise();
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

        let testCallResult = await this.http.post(this.editedNetworkEntry.accountRpcUrl + "/api", JSON.stringify({}), httpOptions).toPromise();
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
    void this.globalNav.navigateBack();
  }
}
