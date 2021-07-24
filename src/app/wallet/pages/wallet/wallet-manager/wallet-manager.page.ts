import { Component, OnInit, ViewChild } from '@angular/core';
import { WalletManager } from '../../../services/wallet.service';
import { Native } from '../../../services/native.service';
import { MasterWallet } from '../../../model/wallets/MasterWallet';
import { WalletEditionService } from '../../../services/walletedition.service';
import { Util } from '../../../model/Util';
import { Config } from '../../../config/Config';
import { TranslateService } from '@ngx-translate/core';
import { WalletAccessService } from '../../../services/walletaccess.service';
import { Router } from '@angular/router';
import { CurrencyService } from '../../../services/currency.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';


@Component({
    selector: 'app-wallet-manager',
    templateUrl: './wallet-manager.page.html',
    styleUrls: ['./wallet-manager.page.scss'],
})
export class WalletManagerPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public Util = Util;
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
        public walletManager: WalletManager,
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

    walletSelected(masterWallet: MasterWallet) {
        if (this.forIntent) {
            if (this.intent === 'access') {
                this.walletAccessService.masterWalletId = masterWallet.id;
                this.native.go('/wallet/access');
            } else if (this.intent === 'addcoin') {
                this.walletEditionService.modifiedMasterWalletId = masterWallet.id;
                this.native.go("/wallet/coin-add-erc20", { contract: this.intentParams.contract });
            }
        } else {
            this.walletManager.setActiveMasterWallet(masterWallet.id);
            this.native.pop();
        }
    }

    goWalletSettings(masterWallet: MasterWallet) {
        this.walletEditionService.modifiedMasterWalletId = masterWallet.id;
        this.native.go("/wallet/wallet-settings");
    }

    getWalletIndex(masterWallet: MasterWallet): number {
       return this.walletManager.getWalletsList().indexOf(masterWallet);
    }
}
