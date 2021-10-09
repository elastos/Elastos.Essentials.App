import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Util } from 'src/app/model/util';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { CoinType } from '../../../model/coin';
import { MasterWallet } from '../../../model/wallets/masterwallet';
import { CoinTransferService } from '../../../services/cointransfer.service';
import { CurrencyService } from '../../../services/currency.service';
import { Native } from '../../../services/native.service';
import { UiService } from '../../../services/ui.service';
import { WalletService } from '../../../services/wallet.service';


@Component({
  selector: 'app-select-subwallet',
  templateUrl: './select-subwallet.page.html',
  styleUrls: ['./select-subwallet.page.scss'],
})
export class SelectSubwalletPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public CoinType = CoinType;
  public subWalletId: string;

  private nextScreen = '';

  constructor(
    public walletManager: WalletService,
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
    this.subWalletId = this.coinTransferService.subWalletId;
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('wallet.select-subwallet'));
    this.titleBar.setNavigationMode(null);
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
