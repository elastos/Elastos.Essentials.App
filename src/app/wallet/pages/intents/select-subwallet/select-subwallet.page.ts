import { Component, OnInit } from '@angular/core';
import { WalletManager } from '../../../services/wallet.service';
import { CoinTransferService } from '../../../services/cointransfer.service';
import { UiService } from '../../../services/ui.service';
import { StandardCoinName, CoinType } from '../../../model/Coin';
import { TranslateService } from '@ngx-translate/core';
import { CurrencyService } from '../../../services/currency.service';
import { AppService } from '../../../services/app.service';
import { IntentService } from '../../../services/intent.service';
import { MasterWallet } from '../../../model/wallets/MasterWallet';
import { Native } from '../../../services/native.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

declare let appManager: AppManagerPlugin.AppManager;

@Component({
  selector: 'app-select-subwallet',
  templateUrl: './select-subwallet.page.html',
  styleUrls: ['./select-subwallet.page.scss'],
})
export class SelectSubwalletPage implements OnInit {

  public CoinType = CoinType;
  public chainId: StandardCoinName;

  constructor(
    public appService: AppService,
    public walletManager: WalletManager,
    public coinTransferService: CoinTransferService,
    public uiService: UiService,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    public currencyService: CurrencyService,
    public intentService: IntentService,
    private native: Native
  ) { }

  ngOnInit() {
    this.chainId = this.coinTransferService.chainId;
    // this.chainId = StandardCoinName.ETHSC;
  }

  ionViewWillEnter() {
    this.appService.setTitleBarTitle(this.translate.instant('select-subwallet'));
    // TODO @chad this.appService.setBackKeyVisibility(false);
  }

  walletSelected(masterWallet: MasterWallet) {
    this.coinTransferService.masterWalletId = masterWallet.id;
    this.coinTransferService.walletInfo = masterWallet.account;
    this.native.go("/waitforsync");
  }

  async cancelOperation() {
    const intentParams = this.coinTransferService.intentTransfer;
    await this.intentService.sendIntentResponse(
        { txid: null, status: 'cancelled' },
        intentParams.intentId
    );
  }
}
