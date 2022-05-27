import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { Events } from 'src/app/services/events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { Config } from '../../../config/Config';
import { MasterWallet } from '../../../model/masterwallets/masterwallet';
import { CurrencyService } from '../../../services/currency.service';
import { Native } from '../../../services/native.service';
import { WalletService } from '../../../services/wallet.service';
import { WalletAccessService } from '../../../services/walletaccess.service';
import { WalletEditionService } from '../../../services/walletedition.service';


@Component({
    selector: 'app-wallet-manager',
    templateUrl: './wallet-manager.page.html',
    styleUrls: ['./wallet-manager.page.scss'],
})
export class WalletManagerPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public WalletUtil = WalletUtil;
    public SELA = Config.SELA;

    public forIntent = false;
    public intent: string = null;
    public intentParams: any = null;

    constructor(
        public events: Events,
        public native: Native,
        public router: Router,
        public theme: GlobalThemeService,
        private walletEditionService: WalletEditionService,
        public walletManager: WalletService,
        private translate: TranslateService,
        private walletAccessService: WalletAccessService,
        public currencyService: CurrencyService
    ) {
    }

    ngOnInit() {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            this.forIntent = navigation.extras.state.forIntent;
            this.intent = navigation.extras.state.intent;
            this.intentParams = navigation.extras.state.intentParams;
            Logger.log('wallet', 'For intent?', this.forIntent, this.intent);
        }
    }

    ionViewWillEnter() {
        this.forIntent ?
            this.titleBar.setTitle(this.translate.instant('wallet.intent-select-wallet')) :
            this.titleBar.setTitle(this.translate.instant('wallet.settings-my-wallets'));
    }

    async walletSelected(masterWallet: MasterWallet) {
        if (this.forIntent) {
            if (this.intent === 'access') {
                this.walletAccessService.masterWalletId = masterWallet.id;
                this.native.go('/wallet/access');
            } else if (this.intent === 'addcoin') {
                this.walletEditionService.modifiedMasterWalletId = masterWallet.id;
                this.native.go("/wallet/coin-add-erc20", { contract: this.intentParams.contract });
            }
        } else {
            await this.walletManager.setActiveMasterWallet(masterWallet.id);
            this.native.pop();
        }
    }

    goWalletSettings(networkWallet: AnyNetworkWallet) {
        this.walletEditionService.modifiedMasterWalletId = networkWallet.id;
        this.native.go("/wallet/wallet-settings");
    }

    getWalletIndex(masterWallet: MasterWallet): number {
        return this.walletManager.getMasterWalletsList().indexOf(masterWallet);
    }
}
