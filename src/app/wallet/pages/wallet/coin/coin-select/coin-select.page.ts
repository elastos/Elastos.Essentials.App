import { Component, OnInit, ViewChild } from '@angular/core';
import { Native } from '../../../../services/native.service';
import { ActivatedRoute } from '@angular/router';
import { WalletService } from '../../../../services/wallet.service';
import { SubWallet } from '../../../../model/wallets/subwallet';
import { StandardCoinName, CoinType } from '../../../../model/Coin';
import { CoinTransferService } from '../../../../services/cointransfer.service';
import { Util } from '../../../../model/util';
import { Config } from '../../../../config/Config';
import { TranslateService } from '@ngx-translate/core';
import { CurrencyService } from '../../../../services/currency.service';
import { UiService } from '../../../../services/ui.service';
import { MasterWallet } from '../../../../model/wallets/masterwallet';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { NetworkWallet } from 'src/app/wallet/model/wallets/networkwallet';

@Component({
    selector: 'app-coin-select',
    templateUrl: './coin-select.page.html',
    styleUrls: ['./coin-select.page.scss'],
})

export class CoinSelectPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public networkWallet: NetworkWallet;
    // Available subwallets to transfer to
    public subWallets: SubWallet[] = [];

    // Helpers
    public Util = Util;
    private SELA = Config.SELA;
    public CoinType = CoinType;

    constructor(
        public route: ActivatedRoute,
        public native: Native,
        private walletManager: WalletService,
        private coinTransferService: CoinTransferService,
        public theme: GlobalThemeService,
        private translate: TranslateService,
        public currencyService: CurrencyService,
        public uiService: UiService
    ) {
        this.init();
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.coin-select-title"));
    }

    init() {
        this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.coinTransferService.masterWalletId);

        // Filter out the subwallet being transferred from
        if (this.coinTransferService.elastosChainCode !== 'ELA') {
            this.subWallets = [this.networkWallet.getSubWallet('ELA')];
        } else {
            this.subWallets = this.networkWallet.subWalletsWithExcludedCoin(this.coinTransferService.elastosChainCode, CoinType.STANDARD);
        }
    }

    onItem(wallet: SubWallet) {
        // Define subwallets to transfer to and from
        this.coinTransferService.toElastosChainCode = wallet.id;

        this.native.go("/wallet/coin-transfer");
    }
}
