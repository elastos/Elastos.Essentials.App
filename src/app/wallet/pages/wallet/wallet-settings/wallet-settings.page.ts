import { Component, OnInit, ViewChild } from '@angular/core';
import { LocalStorage } from '../../../services/storage.service';
import { PopupProvider } from "../../../services/popup.service";
import { WalletManager } from '../../../services/wallet.service';
import { Native } from '../../../services/native.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Util } from '../../../model/Util';
import { Config } from '../../../config/Config';
import { WalletEditionService } from '../../../services/walletedition.service';
import { MasterWallet } from '../../../model/wallets/MasterWallet';
import { TranslateService } from '@ngx-translate/core';
import { CurrencyService } from '../../../services/currency.service';
import { AuthService } from '../../../services/auth.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { PopoverController } from '@ionic/angular';
import { WarningComponent } from 'src/app/wallet/components/warning/warning.component';
import { Events } from 'src/app/services/events.service';
import { StandardCoinName } from 'src/app/wallet/model/Coin';

@Component({
    selector: 'app-wallet-settings',
    templateUrl: './wallet-settings.page.html',
    styleUrls: ['./wallet-settings.page.scss'],
})
export class WalletSettingsPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public masterWallet: MasterWallet;

    public walletName = "";
    private masterWalletId = "1";
    public masterWalletType = "";

    public singleAddress = false;

    public currentLanguageName = "";
    public readonly = "";
    public popover: any = null;

    // Helpers
    public Util = Util;
    public SELA = Config.SELA;

    public settings = [
        {
            type: 'wallet-export',
            route: null,
            title: this.translate.instant("wallet.wallet-settings-backup-wallet"),
            subtitle: this.translate.instant("wallet.wallet-settings-backup-wallet-subtitle"),
            icon: '/assets/wallet/settings/key.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/key.svg'
        },
        {
            type: 'wallet-name',
            route: "/wallet/wallet-edit-name",
            title: this.translate.instant("wallet.wallet-settings-change-name"),
            subtitle: this.translate.instant("wallet.wallet-settings-change-name-subtitle"),
            icon: '/assets/wallet/settings/pen.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/pen.svg'
        },
        {
            type: 'wallet-color',
            route: "/wallet/wallet-color",
            title: this.translate.instant("wallet.wallet-settings-change-theme"),
            subtitle: this.translate.instant("wallet.wallet-settings-change-theme-subtitle"),
            icon: '/assets/wallet/settings/picture.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/picture.svg'
        },
        {
            type: 'coin-list',
            route: "/wallet/coin-list",
            title: this.translate.instant("wallet.wallet-settings-manage-coin-list"),
            subtitle: this.translate.instant("wallet.wallet-settings-manage-coin-list-subtitle"),
            icon: '/assets/wallet/settings/coins.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/coins.svg'
        },
        {
            type: 'wallet-delete',
            route: null,
            title: this.translate.instant("wallet.wallet-settings-delete-wallet"),
            subtitle: this.translate.instant("wallet.wallet-settings-delete-wallet-subtitle"),
            icon: '/assets/wallet/settings/trash.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/trash.svg'
        },
  /*       {
            type: 'wallet-swap',
            route: "/wallet/swap-test",
            title: this.translate.instant("SWAP TEST"),
            subtitle: this.translate.instant("This is a temporary screen"),
            icon: '/assets/wallet/settings/trash.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/trash.svg'
        }, */
    ];

    constructor(
        public route: ActivatedRoute,
        public router: Router,
        public events: Events,
        public localStorage: LocalStorage,
        public popupProvider: PopupProvider,
        public walletManager: WalletManager,
        public native: Native,
        private translate: TranslateService,
        private walletEditionService: WalletEditionService,
        public theme: GlobalThemeService,
        public currencyService: CurrencyService,
        private authService: AuthService,
        private popoverCtrl: PopoverController
    ) {
    }

    ngOnInit() {
        this.masterWalletId = this.walletEditionService.modifiedMasterWalletId;
        this.masterWallet = this.walletManager.getMasterWallet(this.masterWalletId);
        Logger.log('wallet', 'Settings for master wallet - ' + this.masterWallet);
        this.getMasterWalletBasicInfo();

        // Legacy support: ability to migrate remaining balances from DID 1 to DID 2 chains
        // Show this menu entry only if the DID 1.0 subwallet balance is non 0 to not pollute all users
        // with this later on.
        let did1SubWallet = this.masterWallet.getSubWallet(StandardCoinName.IDChain);
        // Cross chain transaction need 20000 for fee.
        if (did1SubWallet && did1SubWallet.balance.gt(20000)) {
            this.settings.push({
                type: 'wallet-did1-transfer',
                route: null,
                title: this.translate.instant("wallet.wallet-settings-migrate-did1"),
                subtitle: this.translate.instant("wallet.wallet-settings-migrate-did1-subtitle"),
                icon: '/assets/wallet/settings/dollar.svg',
                iconDarkmode: '/assets/wallet/settings/darkmode/dollar.svg'
            });
        }
    }

    ionViewWillEnter() {
        // Update walletName when modify name
        this.walletName = this.walletManager.masterWallets[this.masterWalletId].name;

        this.titleBar.setTitle(this.translate.instant("wallet.wallet-settings-title"));
    }

    async getPassword() {
        try {
            const payPassword = await this.authService.getWalletPassword(this.masterWalletId, true, true);
            if (payPassword) {
                this.native.go('/wallet/mnemonic/export', { payPassword: payPassword });
            }
        } catch (e) {
            Logger.error('wallet', 'MnemonicExportPage getWalletPassword error:' + e);
        }
    }

    async onDelete() {
        try {
            const payPassword = await this.authService.getWalletPassword(this.masterWalletId, true, true);
            if (payPassword) {
               this.showDeletePrompt();
            }
        } catch (e) {
            Logger.error('wallet', 'onDelete getWalletPassword error:' + e);
        }
    }

    private goToDID1Transfer() {
        this.native.go('/wallet/wallet-did1-transfer', {
            masterWalletId: this.masterWallet.id
        });
    }

    async showDeletePrompt() {
        this.popover = await this.popoverCtrl.create({
            mode: 'ios',
            cssClass: 'wallet-warning-component',
            component: WarningComponent,
            translucent: false
        });

        this.popover.onWillDismiss().then(async (params) => {
            this.popover = null;

            if (params && params.data && params.data.delete) {
                await this.destroyWallet(this.masterWalletId);
            }
        });

        return await this.popover.present();
    }

    public async destroyWallet(id: string) {
        await this.walletManager.destroyMasterWallet(id);
        // Remove password
        await this.authService.deleteWalletPassword(id);

        this.events.publish("masterwalletcount:changed", {
            action: 'remove',
        });
    }

    private async getMasterWalletBasicInfo() {
        let ret = await this.walletManager.spvBridge.getMasterWalletBasicInfo(this.masterWalletId);

        this.masterWalletType = ret["Type"];
        this.singleAddress = ret["SingleAddress"];
        this.readonly = ret["InnerType"] || "";
    }

  /*   public goToSetting(item) {
        item.route !== null ? this.native.go(item.route) : this.onDelete();
    } */

    public goToSetting(item) {
        if (item.type === 'wallet-export') {
            this.getPassword();
        } else if (item.type === 'wallet-delete') {
            this.onDelete();
        }
        else if (item.type === 'wallet-did1-transfer') {
            this.goToDID1Transfer();
        } else {
            this.native.go(item.route);
        }
    }
}
