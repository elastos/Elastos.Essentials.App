import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { EVMNetwork } from 'src/app/wallet/model/networks/evms/evm.network';
import { ERC20Coin } from '../../../../model/coin';
import { AnySubWallet } from '../../../../model/networks/base/subwallets/subwallet';
import { Native } from '../../../../services/native.service';
import { WalletService } from '../../../../services/wallet.service';
import { WalletEditionService } from '../../../../services/walletedition.service';


@Component({
  selector: 'app-coin-erc20-details',
  templateUrl: './coin-erc20-details.page.html',
  styleUrls: ['./coin-erc20-details.page.scss'],
})
export class CoinErc20DetailsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private networkWallet: AnyNetworkWallet = null;
  private network: EVMNetwork = null;
  private subWallet: AnySubWallet = null;
  public coin: ERC20Coin;
  public contractAddress = '1234';
  public canDelete = false;

  constructor(
    public theme: GlobalThemeService,
    private native: Native,
    private translate: TranslateService,
    private router: Router,
    public globalPopupService: GlobalPopupService,
    private walletManager: WalletService,
    private walletEditionService: WalletEditionService,
    private globalIntentService: GlobalIntentService,
  ) { }

  ngOnInit() {
    const navigation = this.router.getCurrentNavigation();
    if (!Util.isEmptyObject(navigation.extras.state)) {
      let masterWalletId = navigation.extras.state.masterWalletId;
      let coinId = navigation.extras.state.coinId;
      this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(masterWalletId);
      this.network = <EVMNetwork>this.networkWallet.network;
      this.coin = <ERC20Coin>this.network.getCoinByID(coinId);
      this.subWallet = this.networkWallet.getSubWallet(this.coin.getID());

      Logger.log('wallet', 'ERC20 Masterwallet', this.networkWallet);
      Logger.log('wallet', 'ERC20 Subwallet', this.subWallet);
      Logger.log('wallet', 'ERC20 Details', this.coin);

      /* if (this.coin.coinIsCustom() || this.subWallet && !this.subWallet.getDisplayBalance().isZero()) {
        this.canDelete = true;
      } */

      if (this.coin.coinIsCustom()) {
        this.canDelete = true;
      }

      this.contractAddress = this.coin.getContractAddress();
      this.titleBar.setTitle(this.coin.getSymbol());
    }
  }

  ionViewWillLeave() {
  }

  copy() {
    void this.native.copyClipboard(this.contractAddress);
    this.native.toast(this.translate.instant("wallet.copied"));
  }

  delete() {
    void this.globalPopupService.ionicConfirm('wallet.delete-coin-confirm-title', 'wallet.delete-coin-confirm-subtitle')
      .then(async (data) => {
        if (data) {
          await this.network.deleteERC20Coin(this.coin);
          this.native.pop();
        }
      });
  }

  share() {
    Logger.log('wallet', 'Sending "share" intent for', this.coin);

    const addCoinUrl =
      "https://wallet.web3essentials.io/addcoin?contract=" +
      encodeURIComponent(this.contractAddress);

    void this.globalIntentService.sendIntent("share", {
      title: this.translate.instant("wallet.share-erc20-token"),
      url: addCoinUrl,
    });
  }
}
