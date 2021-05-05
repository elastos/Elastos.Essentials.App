import { Component, OnInit, ViewChild } from '@angular/core';
import { Native } from '../../../../services/native.service';
import { TranslateService } from '@ngx-translate/core';
import { Util } from '../../../../model/Util';
import { Router } from '@angular/router';
import { ERC20Coin, Coin } from '../../../../model/Coin';
import { CoinService } from '../../../../services/coin.service';
import { PopupProvider } from '../../../../services/popup.service';
import { MasterWallet } from '../../../../model/wallets/MasterWallet';
import { WalletManager } from '../../../../services/wallet.service';
import { WalletEditionService } from '../../../../services/walletedition.service';
import { SubWallet } from '../../../../model/wallets/SubWallet';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Logger } from 'src/app/logger';


@Component({
  selector: 'app-coin-erc20-details',
  templateUrl: './coin-erc20-details.page.html',
  styleUrls: ['./coin-erc20-details.page.scss'],
})
export class CoinErc20DetailsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private masterWallet: MasterWallet = null;
  private subWallet: SubWallet = null;
  public coin: ERC20Coin;
  public contractAddress: string = '1234';
  public canDelete: boolean = false;

  public Util = Util;

  constructor(
    public theme: GlobalThemeService,
    private native: Native,
    private translate: TranslateService,
    private router: Router,
    private coinService: CoinService,
    private popupProvider: PopupProvider,
    private walletManager: WalletManager,
    private walletEditionService: WalletEditionService,
    private globalIntentService: GlobalIntentService,
  ) { }

  ngOnInit() {
    const navigation = this.router.getCurrentNavigation();
    if (!Util.isEmptyObject(navigation.extras.state)) {
        this.coin = navigation.extras.state.coin;
        this.masterWallet = this.walletManager.getMasterWallet(this.walletEditionService.modifiedMasterWalletId);
        this.subWallet = this.masterWallet.getSubWallet(this.coin.getID());

        Logger.log('wallet', 'ERC20 Masterwallet', this.masterWallet);
        Logger.log('wallet', 'ERC20 Subwallet', this.subWallet);
        Logger.log('wallet', 'ERC20 Details', this.coin);

        /* if (this.coin.coinIsCustom() || this.subWallet && !this.subWallet.getDisplayBalance().isZero()) {
          this.canDelete = true;
        } */

        if (this.coin.coinIsCustom()) {
          this.canDelete = true;
        }

        this.contractAddress = this.coin.getContractAddress();
        this.titleBar.setTitle(this.coin.getName());
    }
  }

  ionViewWillLeave() {
    if (this.popupProvider.alertPopup) {
      this.popupProvider.alertCtrl.dismiss();
      this.popupProvider.alertPopup = null;
    }
  }

  copy() {
    this.native.copyClipboard(this.contractAddress);
    this.native.toast(this.translate.instant("wallet.copied"));
  }

  async delete() {
    this.popupProvider.ionicConfirm('wallet.delete-coin-confirm-title', 'wallet.delete-coin-confirm-subtitle')
      .then(async (data) => {
        if (data) {
          await this.coinService.deleteERC20Coin(this.coin);
          this.native.pop();
        }
    });
  }

  share() {
    Logger.log('wallet', 'Sending "share" intent for', this.coin);

    const addCoinUrl =
      "https://wallet.elastos.net/addcoin?contract=" +
      encodeURIComponent(this.contractAddress);

    this.globalIntentService.sendIntent("share", {
      title: this.translate.instant("wallet.share-erc20-token"),
      url: addCoinUrl,
    });
  }
}
