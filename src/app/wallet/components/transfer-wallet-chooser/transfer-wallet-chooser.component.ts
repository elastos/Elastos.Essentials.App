import { Component, OnInit, ViewChild } from '@angular/core';
import { WalletManager } from '../../services/wallet.service';
import { UiService } from '../../services/ui.service';
import { StandardCoinName, CoinType } from '../../model/Coin';
import { TranslateService } from '@ngx-translate/core';
import { CurrencyService } from '../../services/currency.service';
import { MasterWallet } from '../../model/wallets/MasterWallet';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Logger } from 'src/app/logger';
import { ModalController, NavParams } from '@ionic/angular';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';

export type WalletChooserComponentOptions = {
    sourceWallet: MasterWallet; // Master wallet from which funds will be transfered
    elastosChainCode: StandardCoinName; // Target chain ID, used to display available balance for each wallet
    excludeWalletId?: string; // Optional wallet to not show in the list of selectable wallets
}

@Component({
  selector: 'app-transfer-wallet-chooser',
  templateUrl: './transfer-wallet-chooser.component.html',
  styleUrls: ['./transfer-wallet-chooser.component.scss'],
})
export class TransferWalletChooserComponent implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public CoinType = CoinType;
  public options: WalletChooserComponentOptions = null;
  public walletsToShowInList: MasterWallet[];

  constructor(
    private navParams: NavParams,
    public walletManager: WalletManager,
    public uiService: UiService,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    public currencyService: CurrencyService,
    private modalCtrl: ModalController
  ) {
  }

  ngOnInit() {
    this.options = this.navParams.data as WalletChooserComponentOptions;

    this.walletsToShowInList = this.walletManager.getWalletsList();
    // Exclude current wallet if needed
    if (this.options.excludeWalletId) {
      this.walletsToShowInList = this.walletsToShowInList.filter((w) => {
        return w.id !== this.options.excludeWalletId;
      });
    }
  }

  walletSelected(masterWallet: MasterWallet) {
    Logger.log("wallet", "Wallet selected", masterWallet);

    this.modalCtrl.dismiss({
      selectedWalletId: masterWallet.id
    });
  }

  cancelOperation() {
    Logger.log("wallet", "Wallet selection cancelled");
    this.modalCtrl.dismiss();
  }
}
