import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Util } from 'src/app/model/util';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { CoinType } from 'src/app/wallet/model/coin';
import { BridgeProvider } from 'src/app/wallet/model/earn/bridgeprovider';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { AnySubWallet } from 'src/app/wallet/model/networks/base/subwallets/subwallet';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { CurrencyService } from 'src/app/wallet/services/currency.service';
import { BridgeService } from 'src/app/wallet/services/evm/bridge.service';
import { UiService } from 'src/app/wallet/services/ui.service';
import { Native } from '../../../../services/native.service';
import { LocalStorage } from '../../../../services/storage.service';
import { WalletService } from '../../../../services/wallet.service';

@Component({
    selector: 'app-coin-bridge',
    templateUrl: './coin-bridge.page.html',
    styleUrls: ['./coin-bridge.page.scss'],
})
export class CoinBridgePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public WalletUtil = WalletUtil;
    public CoinType = CoinType;

    public networkWallet: AnyNetworkWallet;
    public subWallet: AnySubWallet;

    constructor(
        public route: ActivatedRoute,
        public native: Native,
        public localStorage: LocalStorage,
        public events: GlobalEvents,
        private router: Router,
        public uiService: UiService,
        private walletManager: WalletService,
        public currencyService: CurrencyService,
        public bridgeService: BridgeService,
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

            let test = this.bridgeService.getDestinationNetworksForProvider(
                this.subWallet.networkWallet.network.bridgeProviders[0],
                this.subWallet.networkWallet.network);

            console.log("TEST", test);
        }
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.wallet-coin-bridge-title"));
    }

    openBridgeProvider(provider: BridgeProvider) {
        this.bridgeService.openBridgeProvider(provider, this.subWallet);
    }
}
