import { Component, OnInit, ViewChild } from '@angular/core';
import { WalletManager } from '../../../services/wallet.service';
import { CoinTransferService } from '../../../services/cointransfer.service';
import { UiService } from '../../../services/ui.service';
import { StandardCoinName, CoinType } from '../../../model/Coin';
import { TranslateService } from '@ngx-translate/core';
import { CurrencyService } from '../../../services/currency.service';
import { MasterWallet } from '../../../model/wallets/MasterWallet';
import { Native } from '../../../services/native.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Router } from '@angular/router';
import { Util } from 'src/app/wallet/model/Util';


@Component({
  selector: 'app-select-subwallet',
  templateUrl: './select-subwallet.page.html',
  styleUrls: ['./select-subwallet.page.scss'],
})
export class SelectSubwalletPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public CoinType = CoinType;
  public elastosChainCode: StandardCoinName;

  private nextScreen = '';

  constructor(
    public walletManager: WalletManager,
    public coinTransferService: CoinTransferService,
    public uiService: UiService,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    public currencyService: CurrencyService,
    private globalIntentService: GlobalIntentService,
    private router: Router,
    private native: Native
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (!Util.isEmptyObject(navigation.extras.state)) {
        this.nextScreen = navigation.extras.state.nextScreen;
    }
  }

  ngOnInit() {
    this.elastosChainCode = this.coinTransferService.elastosChainCode;
    // this.elastosChainCode = StandardCoinName.ETHSC;
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('wallet.select-subwallet'));
    this.titleBar.setNavigationMode(null);
    // TODO @chad this.appService.setBackKeyVisibility(false);
  }

  walletSelected(masterWallet: MasterWallet) {
    this.coinTransferService.masterWalletId = masterWallet.id;
    this.coinTransferService.walletInfo = masterWallet.account;
    this.native.go(this.nextScreen);
  }

  async cancelOperation() {
    const intentParams = this.coinTransferService.intentTransfer;
    await this.globalIntentService.sendIntentResponse(
        { txid: null, status: 'cancelled' },
        intentParams.intentId
    );
  }
}
