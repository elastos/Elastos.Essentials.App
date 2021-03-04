import { Component, OnInit } from '@angular/core';
import { Native } from '../../../../services/native.service';
import { ActivatedRoute } from '@angular/router';
import { WalletManager } from '../../../../services/wallet.service';
import { SubWallet } from '../../../../model/wallets/SubWallet';
import { StandardCoinName, CoinType } from '../../../../model/Coin';
import { CoinTransferService } from '../../../../services/cointransfer.service';
import { AppService } from '../../../../services/app.service';
import { Util } from '../../../../model/Util';
import { Config } from '../../../../config/Config';
import { TranslateService } from '@ngx-translate/core';
import { CurrencyService } from '../../../../services/currency.service';
import { UiService } from '../../../../services/ui.service';
import { MasterWallet } from '../../../../model/wallets/MasterWallet';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
    selector: 'app-coin-select',
    templateUrl: './coin-select.page.html',
    styleUrls: ['./coin-select.page.scss'],
})

export class CoinSelectPage implements OnInit {

    public masterWallet: MasterWallet;
    // Available subwallets to transfer to
    public subWallets: SubWallet[] = [];

    // Helpers
    public Util = Util;
    private SELA = Config.SELA;
    public CoinType = CoinType;

    constructor(
        public route: ActivatedRoute,
        public native: Native,
        private walletManager: WalletManager,
        private coinTransferService: CoinTransferService,
        public theme: GlobalThemeService,
        private translate: TranslateService,
        private appService: AppService,
        public currencyService: CurrencyService,
        public uiService: UiService
    ) {
        this.init();
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.appService.setTitleBarTitle(this.translate.instant("coin-select-title"));
    }

    init() {
        this.masterWallet = this.walletManager.getMasterWallet(this.coinTransferService.masterWalletId);

        // Filter out the subwallet being transferred from
        if (this.coinTransferService.chainId !== 'ELA') {
            this.subWallets = [this.masterWallet.getSubWallet('ELA')];
        } else {
            this.subWallets = this.masterWallet.subWalletsWithExcludedCoin(this.coinTransferService.chainId, CoinType.STANDARD);
        }
    }

    onItem(wallet: SubWallet) {
        // Define subwallets to transfer to and from
        this.coinTransferService.subchainId = wallet.id;

        this.native.go("/coin-transfer");
    }
}
