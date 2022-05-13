import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TxSuccessComponent } from 'src/app/wallet/components/tx-success/tx-success.component';
import { WarningComponent } from 'src/app/wallet/components/warning/warning.component';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { Utxo } from 'src/app/wallet/model/providers/transaction.types';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { WalletCreateType } from 'src/app/wallet/model/walletaccount';
import { MainAndIDChainSubWallet } from 'src/app/wallet/model/wallets/elastos/mainandidchain.subwallet';
import { NetworkWallet } from 'src/app/wallet/model/wallets/networkwallet';
import { Transfer } from 'src/app/wallet/services/cointransfer.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { Config } from '../../../config/Config';
import { MasterWallet } from '../../../model/wallets/masterwallet';
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
    public networkWallet: NetworkWallet;

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
        private walletNetworkService: WalletNetworkService,
        public theme: GlobalThemeService,
        public currencyService: CurrencyService,
        private authService: AuthService,
        private popoverCtrl: PopoverController,
        private globalNative: GlobalNativeService,
    ) {
    }

    async ngOnInit() {
        this.masterWalletId = this.walletEditionService.modifiedMasterWalletId;
        if (!this.masterWalletId) {
            this.masterWalletId = this.walletManager.getActiveMasterWallet().id;
        }
        this.masterWallet = this.walletManager.getMasterWallet(this.masterWalletId);
        this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.masterWalletId);
        this.canExportKeystore = this.masterWallet.createType === WalletCreateType.MNEMONIC
                || this.masterWallet.createType === WalletCreateType.KEYSTORE;
        Logger.log('wallet', 'Settings for master wallet - ' + this.networkWallet);
        await this.getMasterWalletBasicInfo();

        if (this.networkWallet.supportsERC20Coins()) {
            this.settings.push({
                type: 'coin-list',
                route: "/wallet/coin-list",
                title: this.translate.instant("wallet.wallet-settings-manage-coin-list"),
                subtitle: this.translate.instant("wallet.wallet-settings-manage-coin-list-subtitle"),
                icon: '/assets/wallet/settings/coins.svg',
                iconDarkmode: '/assets/wallet/settings/darkmode/coins.svg'
            });
        }

        // Legacy support: ability to migrate remaining balances from DID 1 to DID 2 chains
        // Show this menu entry only if the DID 1.0 subwallet balance is non 0 to not pollute all users
        // with this later on.
        let did1SubWallet = this.networkWallet.getSubWallet(StandardCoinName.IDChain);
        // Cross chain transaction need 20000 for fee.
        if (did1SubWallet && did1SubWallet.getRawBalance().gt(20000)) {
            this.settings.push({
                type: 'wallet-did1-transfer',
                route: null,
                title: this.translate.instant("wallet.wallet-settings-migrate-did1"),
                subtitle: this.translate.instant("wallet.wallet-settings-migrate-did1-subtitle"),
                icon: '/assets/wallet/settings/dollar.svg',
                iconDarkmode: '/assets/wallet/settings/darkmode/dollar.svg'
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

        if (this.walletNetworkService.isActiveNetworkElastos()) {
            this.settings.push({
                type: 'wallet-consolidate-utxos',
                route: null,
                title: this.translate.instant("wallet.wallet-settings-consolidate-utxos"),
                subtitle: this.translate.instant("wallet.wallet-settings-consolidate-utxos-subtitle"),
                icon: '/assets/wallet/settings/consolidate.svg',
                iconDarkmode: '/assets/wallet/settings/darkmode/consolidate.svg'
            });
        }
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

    private goToDID1Transfer() {
        this.native.go('/wallet/wallet-did1-transfer', {
            masterWalletId: this.networkWallet.id
        });
    }

    private async checkUtxosCount() {
        let normalUxtos: Utxo[] = null;
        let utxosCount = -1;
        let mainChainSubwallet = this.networkWallet.getSubWallet(StandardCoinName.ELA) as MainAndIDChainSubWallet

        await this.native.showLoading(this.translate.instant('common.please-wait'));
        try {
            normalUxtos = await mainChainSubwallet.getNormalUtxos();
            utxosCount = normalUxtos.length;
        } catch (err) {
            Logger.warn('wallet', ' getNormalUtxos error', err)
        }
        await this.native.hideLoading();

        if (utxosCount > Config.UTXO_CONSOLIDATE_MIN_THRESHOLD) {
            const UTXOsCountString = this.translate.instant('wallet.text-consolidate-UTXO-counts', {count: utxosCount});
            let ret = await this.popupProvider.ionicConfirmWithSubTitle('wallet.text-consolidate-prompt',
                UTXOsCountString, 'wallet.text-consolidate-note')
            if (ret) {
                let rawTx = await mainChainSubwallet.createConsolidateTransaction(normalUxtos,
                        this.translate.instant('wallet.wallet-settings-consolidate-utxos'));
                if (rawTx) {
                    const transfer = new Transfer();
                    Object.assign(transfer, {
                        masterWalletId: this.networkWallet.id,
                        subWalletId: StandardCoinName.ELA,
                        rawTransaction: rawTx,
                        action: null,
                        intentId: null
                    });

                    const result = await mainChainSubwallet.signAndSendRawTransaction(rawTx, transfer);
                    if (result.published)
                        void this.showSuccess();
                }
            }
        } else {
            this.globalNative.genericToast('wallet.wallet-settings-consolidate-no-need')
        }
    }

    async showSuccess() {
        this.native.popup = await this.native.popoverCtrl.create({
            mode: 'ios',
            cssClass: 'wallet-tx-component',
            component: TxSuccessComponent,
        });
        this.native.popup.onWillDismiss().then(() => {
            this.native.popup = null;
        });
        return await this.native.popup.present();
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
            if (this.canExportKeystore) {
                this.showExportMenu = !this.showExportMenu;
            } else {
                void this.export();
            }
        } else if (item.type === 'wallet-delete') {
            void this.onDelete();
        } else if (item.type === 'wallet-consolidate-utxos') {
            void this.checkUtxosCount();
        } else if (item.type === 'wallet-did1-transfer') {
            this.goToDID1Transfer();
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
