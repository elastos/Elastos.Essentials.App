import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Util } from 'src/app/model/util';
import { Events } from 'src/app/services/events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { CoinType } from 'src/app/wallet/model/coin';
import { SwapProvider } from 'src/app/wallet/model/earn/swapprovider';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { AnyNetworkWallet } from 'src/app/wallet/model/wallets/networkwallet';
import { AnySubWallet } from 'src/app/wallet/model/wallets/subwallet';
import { CurrencyService } from 'src/app/wallet/services/currency.service';
import { EarnService } from 'src/app/wallet/services/evm/earn.service';
import { SwapService } from 'src/app/wallet/services/evm/swap.service';
import { UiService } from 'src/app/wallet/services/ui.service';
import { Native } from '../../../../services/native.service';
import { LocalStorage } from '../../../../services/storage.service';
import { WalletService } from '../../../../services/wallet.service';
import { WalletEditionService } from '../../../../services/walletedition.service';

@Component({
    selector: 'app-coin-swap',
    templateUrl: './coin-swap.page.html',
    styleUrls: ['./coin-swap.page.scss'],
})
export class CoinSwapPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public WalletUtil = WalletUtil;
    public CoinType = CoinType;

    public networkWallet: AnyNetworkWallet;
    public subWallet: AnySubWallet;

    constructor(
        public route: ActivatedRoute,
        public native: Native,
        public localStorage: LocalStorage,
        public events: Events,
        private router: Router,
        public uiService: UiService,
        private earnService: EarnService,
        private walletManager: WalletService,
        public currencyService: CurrencyService,
        private swapService: SwapService,
        private walletEditionService: WalletEditionService,
        private translate: TranslateService,
        public theme: GlobalThemeService
    ) {

    }

    ngOnInit() {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            let masterWalletId = navigation.extras.state.masterWalletId;
            let subWalletId = navigation.extras.state.subWalletId;

            this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(masterWalletId);
            this.subWallet = this.networkWallet.getSubWallet(subWalletId);
        }
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.wallet-coin-swap-title"));
    }

    openSwapProvider(provider: SwapProvider) {
        this.swapService.openSwapProvider(provider, this.subWallet);
    }
}
