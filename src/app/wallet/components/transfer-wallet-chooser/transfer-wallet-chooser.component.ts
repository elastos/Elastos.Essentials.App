import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { CoinType } from '../../model/coin';
import { NetworkWallet } from '../../model/wallets/networkwallet';
import { CurrencyService } from '../../services/currency.service';
import { UiService } from '../../services/ui.service';
import { WalletService } from '../../services/wallet.service';

export type WalletChooserComponentOptions = {
  sourceWallet: NetworkWallet; // Master wallet from which funds will be transfered
  subWalletId: string; // Target chain ID, used to display available balance for each wallet
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
  public walletsToShowInList: NetworkWallet[];

  constructor(
    private navParams: NavParams,
    public walletManager: WalletService,
    public uiService: UiService,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    public currencyService: CurrencyService,
    private modalCtrl: ModalController
  ) {
  }

  ngOnInit() {
    this.options = this.navParams.data as WalletChooserComponentOptions;

    this.walletsToShowInList = this.walletManager.getNetworkWalletsList();
    // Exclude current wallet if needed
    if (this.options.excludeWalletId) {
      this.walletsToShowInList = this.walletsToShowInList.filter((w) => {
        return w.id !== this.options.excludeWalletId;
      });
    }
  }

  walletSelected(networkWallet: NetworkWallet) {
    Logger.log("wallet", "Wallet selected", networkWallet);

    void this.modalCtrl.dismiss({
      selectedWalletId: networkWallet.id
    });
  }

  cancelOperation() {
    Logger.log("wallet", "Wallet selection cancelled");
    void this.modalCtrl.dismiss();
  }
}
