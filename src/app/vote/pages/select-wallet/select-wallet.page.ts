import { Component, OnInit, ViewChild } from '@angular/core';
import { WalletManager } from '../../../wallet/services/wallet.service';
import { UiService } from '../../../wallet/services/ui.service';
import { StandardCoinName, CoinType } from '../../../wallet/model/Coin';
import { TranslateService } from '@ngx-translate/core';
import { CurrencyService } from '../../../wallet/services/currency.service';
import { MasterWallet } from '../../../wallet/model/wallets/MasterWallet';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { VoteService } from '../../services/vote.service';


@Component({
    selector: 'app-select-wallet',
    templateUrl: './select-wallet.page.html',
    styleUrls: ['./select-wallet.page.scss'],
})
export class SelectWalletPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public CoinType = CoinType;
    public chainId: StandardCoinName;

    constructor(
        public walletManager: WalletManager,
        public voteService: VoteService,
        public uiService: UiService,
        public translate: TranslateService,
        public theme: GlobalThemeService,
        public currencyService: CurrencyService,
    ) {

    }

    ngOnInit() {
        this.chainId = StandardCoinName.ELA;
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('wallet.select-wallet'));
        // TODO @chad this.appService.setBackKeyVisibility(false);
    }

    async walletSelected(masterWallet: MasterWallet) {
        await this.voteService.navigateTo(masterWallet);
    }
}
