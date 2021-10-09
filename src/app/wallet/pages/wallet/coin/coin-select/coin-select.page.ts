import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { NetworkWallet } from 'src/app/wallet/model/wallets/networkwallet';
import { Config } from '../../../../config/Config';
import { CoinType } from '../../../../model/coin';
import { AnySubWallet } from '../../../../model/wallets/subwallet';
import { CoinTransferService } from '../../../../services/cointransfer.service';
import { CurrencyService } from '../../../../services/currency.service';
import { Native } from '../../../../services/native.service';
import { UiService } from '../../../../services/ui.service';
import { WalletService } from '../../../../services/wallet.service';

@Component({
    selector: 'app-coin-select',
    templateUrl: './coin-select.page.html',
    styleUrls: ['./coin-select.page.scss'],
})

export class CoinSelectPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public networkWallet: NetworkWallet;
    // Available subwallets to transfer to
    public subWallets: AnySubWallet[] = [];

    // Helpers
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
        if (this.coinTransferService.subWalletId !== 'ELA') {
            this.subWallets = [this.networkWallet.getSubWallet('ELA')];
        } else {
            this.subWallets = this.networkWallet.subWalletsWithExcludedCoin(this.coinTransferService.subWalletId, CoinType.STANDARD);
        }
    }

    onItem(wallet: AnySubWallet) {
        // Define subwallets to transfer to and from
        this.coinTransferService.toSubWalletId = wallet.id;

        this.native.go("/wallet/coin-transfer");
    }
}
