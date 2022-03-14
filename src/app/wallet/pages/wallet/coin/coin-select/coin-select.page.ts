import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { Config } from '../../../../config/Config';
import { CoinType, StandardCoinName } from '../../../../model/coin';
import { AnySubWallet } from '../../../../model/networks/base/subwallets/subwallet';
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

    public networkWallet: AnyNetworkWallet;
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
        void this.init();
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.coin-select-title"));
    }

    async init() {
        this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.coinTransferService.masterWalletId);

        // Filter out the subwallet being transferred from
        if (this.coinTransferService.subWalletId !== 'ELA') {
            // TODO: remove it, subWalletId should alway be ELA.
            this.subWallets = [this.networkWallet.getSubWallet('ELA')];
        } else {
            this.subWallets = await this.getELASideChainSubwallets();
        }
    }

    onItem(wallet: AnySubWallet) {
        // Define subwallets to transfer to and from
        this.coinTransferService.toSubWalletId = wallet.id;

        this.native.go("/wallet/coin-transfer");
    }

    // for cross chain transaction.
    async getELASideChainSubwallets() {
      let subwallets: AnySubWallet[] = [];

      let idchian = WalletNetworkService.instance.getNetworkByKey('elastosidchain');
      let idNetworkWallet = await idchian.createNetworkWallet(this.networkWallet.masterWallet, false);
      let idsubwallet = idNetworkWallet.getSubWallet(StandardCoinName.ETHDID);

      subwallets.push(idsubwallet);

      let escchian = WalletNetworkService.instance.getNetworkByKey('elastossmartchain');
      let escNetworkWallet = await escchian.createNetworkWallet(this.networkWallet.masterWallet, false);
      let escsubwallet = escNetworkWallet.getSubWallet(StandardCoinName.ETHSC);

      subwallets.push(escsubwallet);
      return subwallets;
    }
}
