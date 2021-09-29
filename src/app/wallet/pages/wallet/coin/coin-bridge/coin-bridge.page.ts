import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Util } from 'src/app/model/util';
import { Events } from 'src/app/services/events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { CoinType } from 'src/app/wallet/model/coin';
import { BridgeProvider } from 'src/app/wallet/model/earn/bridgeprovider';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { NetworkWallet } from 'src/app/wallet/model/wallets/networkwallet';
import { AnySubWallet } from 'src/app/wallet/model/wallets/subwallet';
import { BridgeService } from 'src/app/wallet/services/bridge.service';
import { EarnService } from 'src/app/wallet/services/earn.service';
import { UiService } from 'src/app/wallet/services/ui.service';
import { Native } from '../../../../services/native.service';
import { LocalStorage } from '../../../../services/storage.service';
import { WalletService } from '../../../../services/wallet.service';
import { WalletEditionService } from '../../../../services/walletedition.service';

@Component({
    selector: 'app-coin-bridge',
    templateUrl: './coin-bridge.page.html',
    styleUrls: ['./coin-bridge.page.scss'],
})
export class CoinBridgePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public WalletUtil = WalletUtil;
    public CoinType = CoinType;

    public networkWallet: NetworkWallet;
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
        private bridgeService: BridgeService,
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
        this.titleBar.setTitle(this.translate.instant("wallet.wallet-coin-bridge-title"));
    }

    openBridgeProvider(provider: BridgeProvider) {
        this.bridgeService.openBridgeProvider(provider, this.subWallet);
    }
}
