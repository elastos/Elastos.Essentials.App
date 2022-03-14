import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { WarningComponent } from 'src/app/wallet/components/warning/warning.component';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { Config } from '../../../config/Config';
import { MasterWallet } from '../../../model/masterwallets/masterwallet';
import { AuthService } from '../../../services/auth.service';
import { CurrencyService } from '../../../services/currency.service';
import { Native } from '../../../services/native.service';
import { PopupProvider } from "../../../services/popup.service";
import { LocalStorage } from '../../../services/storage.service';
import { WalletService } from '../../../services/wallet.service';
import { WalletEditionService } from '../../../services/walletedition.service';

@Component({
    selector: 'app-wallet-settings',
    templateUrl: './wallet-settings.page.html',
    styleUrls: ['./wallet-settings.page.scss'],
})
export class WalletSettingsPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public masterWallet: MasterWallet;
    public networkWallet: AnyNetworkWallet;

    public walletName = "";
    private masterWalletId = "1";
    public masterWalletType = "";

    public singleAddress = false;

    public currentLanguageName = "";
    public readonly = "";
    public popover: any = null;

    // Helpers
    public WalletUtil = WalletUtil;
    public SELA = Config.SELA;

    public canExportKeystore = true;
    public showExportMenu = false;

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
        public walletManager: WalletService,
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
        this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.masterWalletId);
        this.canExportKeystore = false; // TODO - repair - export "private key" keystores, not "elastos keystores" //this.masterWallet.createType === WalletCreateType.MNEMONIC || this.masterWallet.createType === WalletCreateType.KEYSTORE;
        Logger.log('wallet', 'Settings for master wallet - ' + this.networkWallet);

        if (this.networkWallet && this.networkWallet.network.supportsERC20Coins()) {
            this.settings.push({
                type: 'coin-list',
                route: "/wallet/coin-list",
                title: this.translate.instant("wallet.wallet-settings-manage-coin-list"),
                subtitle: this.translate.instant("wallet.wallet-settings-manage-coin-list-subtitle"),
                icon: '/assets/wallet/settings/coins.svg',
                iconDarkmode: '/assets/wallet/settings/darkmode/coins.svg'
            });
        }

        this.settings.push({
            type: 'wallet-delete',
            route: null,
            title: this.translate.instant("wallet.wallet-settings-delete-wallet"),
            subtitle: this.translate.instant("wallet.wallet-settings-delete-wallet-subtitle"),
            icon: '/assets/wallet/settings/trash.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/trash.svg'
        });
    }

    ionViewWillEnter() {
        // Update walletName when modify name
        this.walletName = this.walletManager.masterWallets[this.masterWalletId].name;

        this.titleBar.setTitle(this.translate.instant("wallet.wallet-settings-title"));
    }

    async onDelete() {
        try {
            const payPassword = await this.authService.getWalletPassword(this.masterWalletId, true, true);
            if (payPassword) {
                void this.showDeletePrompt();
            }
        } catch (e) {
            Logger.error('wallet', 'onDelete getWalletPassword error:' + e);
        }
    }

    async showDeletePrompt() {
        this.popover = await this.popoverCtrl.create({
            mode: 'ios',
            cssClass: 'wallet-warning-component',
            component: WarningComponent,
            componentProps: {
                warning: 'delete',
            },
            translucent: false
        });

        this.popover.onWillDismiss().then(async (params) => {
            this.popover = null;

            if (params && params.data && params.data.confirm) {
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

    /*   public goToSetting(item) {
          item.route !== null ? this.native.go(item.route) : this.onDelete();
      } */

    public goToSetting(item) {
        if (item.type === 'wallet-export') {
            if (this.canExportKeystore) {
                this.showExportMenu = !this.showExportMenu;
            } else {
                void this.export();
            }
        } else if (item.type === 'wallet-delete') {
            void this.onDelete();
        } else {
            this.native.go(item.route);
        }
    }

    public async export() {
        try {
            const payPassword = await this.authService.getWalletPassword(this.masterWalletId, true, true);
            if (payPassword) {
                this.native.go('/wallet/mnemonic/export', { payPassword: payPassword });
            }
        } catch (e) {
            Logger.error('wallet', 'WalletSettingsPage getWalletPassword error:' + e);
        }
    }

    public async exportKeystore() {
        try {
            const payPassword = await this.authService.getWalletPassword(this.masterWalletId, true, true);
            if (payPassword) {
                this.native.go('/wallet/wallet-keystore-export', { payPassword: payPassword });
            }
        } catch (e) {
            Logger.error('wallet', 'WalletSettingsPage getWalletPassword error:' + e);
        }
    }
}
