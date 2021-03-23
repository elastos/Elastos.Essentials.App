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
import { Events } from '../../../services/events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';

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

    // Helpers
    public Util = Util;
    public SELA = Config.SELA;

    public settings = [
        {
            type: 'wallet-export',
            // route: "/mnemonic-export",
            route: null,
            title: this.translate.instant("wallet-settings-backup-wallet"),
            subtitle: this.translate.instant("wallet-settings-backup-wallet-subtitle"),
            icon: '/assets/wallet/settings/key.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/key.svg'
        },
        {
            type: 'wallet-name',
            route: "/wallet-edit-name",
            title: this.translate.instant("wallet-settings-change-name"),
            subtitle: this.translate.instant("wallet-settings-change-name-subtitle"),
            icon: '/assets/wallet/settings/pen.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/pen.svg'
        },
        {
            type: 'wallet-color',
            route: "/wallet-color",
            title: this.translate.instant("wallet-settings-change-theme"),
            subtitle: this.translate.instant("wallet-settings-change-theme-subtitle"),
            icon: '/assets/wallet/settings/picture.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/picture.svg'
        },
        // TODO delete wallet-password-reset
        // {
        //     route: "/wallet-password-reset",
        //     title: "Change Password",
        //     subtitle: "Change your wallets secure pay password",
        //     icon: '/assets/wallet/settings/lock.svg',
        //     iconDarkmode: '/assets/wallet/settings/darkmode/lock.svg'
        // },
        {
            type: 'coin-list',
            route: "/wallet/coin-list",
            title: this.translate.instant("wallet-settings-manage-coin-list"),
            subtitle: this.translate.instant("wallet-settings-manage-coin-list-subtitle"),
            icon: '/assets/wallet/settings/coins.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/coins.svg'
        },
        {
            type: 'wallet-delete',
            route: null,
            title: this.translate.instant("wallet-settings-delete-wallet"),
            subtitle: this.translate.instant("wallet-settings-delete-wallet-subtitle"),
            icon: '/assets/wallet/settings/trash.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/trash.svg'
        },
        {
            type: 'wallet-swap',
            route: "/wallet/swap-test",
            title: this.translate.instant("SWAP TEST"),
            subtitle: this.translate.instant("This is a temporary screen"),
            icon: '/assets/wallet/settings/trash.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/trash.svg'
        },
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
    ) {
    }

    ngOnInit() {
        this.masterWalletId = this.walletEditionService.modifiedMasterWalletId;
        this.masterWallet = this.walletManager.getMasterWallet(this.masterWalletId);
        Logger.log('wallet', 'Settings for master wallet - ' + this.masterWallet);
        this.getMasterWalletBasicInfo();
    }

    ionViewWillEnter() {
        // Update walletName when modify name
        this.walletName = this.walletManager.masterWallets[this.masterWalletId].name;

        this.titleBar.setTitle(this.translate.instant("wallet-settings-title"));
    }

    async getPassword() {
        try {
            const payPassword = await this.authService.getWalletPassword(this.masterWalletId, true, true);
            if (payPassword) {
                this.native.go('/wallet/mnemonic-export', { payPassword: payPassword });
            }
        } catch (e) {
            Logger.error('wallet', 'MnemonicExportPage getWalletPassword error:' + e);
        }
    }

    async onDelete() {
        try {
            const payPassword = await this.authService.getWalletPassword(this.masterWalletId, true, true);
            if (payPassword) {
                const confirmToDelete = await this.popupProvider.ionicConfirm('delete-wallet-confirm-title', 'delete-wallet-confirm-subtitle');
                if (confirmToDelete) {
                    await this.destroyWallet(this.masterWalletId);
                }
            }
        } catch (e) {
            Logger.error('wallet', 'onDelete getWalletPassword error:' + e);
        }
    }

    public async destroyWallet(id: string) {
        await this.walletManager.destroyMasterWallet(id);

        this.events.publish("masterwalletcount:changed", {
            action: 'remove',
        });
    }

    private async getMasterWalletBasicInfo() {
        Logger.log('wallet', "2", this.masterWalletId);
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
        } else {
            this.native.go(item.route);
        }
    }
}
