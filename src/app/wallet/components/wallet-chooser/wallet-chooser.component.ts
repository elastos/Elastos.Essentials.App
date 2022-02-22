import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { CoinType } from '../../model/coin';
import { WalletUtil } from '../../model/wallet.util';
import { AnyNetworkWallet } from '../../model/wallets/networkwallet';
import { CurrencyService } from '../../services/currency.service';
import { UiService } from '../../services/ui.service';
import { WalletService } from '../../services/wallet.service';

export type WalletChooserComponentOptions = {
  currentNetworkWallet: AnyNetworkWallet;
}

@Component({
  selector: 'app-wallet-chooser',
  templateUrl: './wallet-chooser.component.html',
  styleUrls: ['./wallet-chooser.component.scss'],
})
export class WalletChooserComponent implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public CoinType = CoinType;
  public options: WalletChooserComponentOptions = null;
  public networkWallet: AnyNetworkWallet;
  public walletsToShowInList: AnyNetworkWallet[];

  // Helper
  public WalletUtil = WalletUtil;

  constructor(
    private navParams: NavParams,
    private walletService: WalletService,
    public uiService: UiService,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    public currencyService: CurrencyService,
    private modalCtrl: ModalController
  ) {
  }

  ngOnInit() {
    this.options = this.navParams.data as WalletChooserComponentOptions;

    this.networkWallet = this.options.currentNetworkWallet;
    this.walletsToShowInList = this.walletService.getNetworkWalletsList();
  }

  selectWallet(wallet: AnyNetworkWallet) {
    Logger.log("wallet", "Wallet selected", wallet);

    void this.modalCtrl.dismiss({
      selectedMasterWalletId: wallet.masterWallet.id
    });
  }

  cancelOperation() {
    Logger.log("wallet", "Wallet selection cancelled");
    void this.modalCtrl.dismiss();
  }
}
