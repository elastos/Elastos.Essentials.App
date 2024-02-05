import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { MenuSheetMenu } from 'src/app/components/menu-sheet/menu-sheet.component';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalTranslationService } from 'src/app/services/global.translation.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { WarningComponent } from 'src/app/wallet/components/warning/warning.component';
import { BitcoinAddressType } from 'src/app/wallet/model/btc.types';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { StandardMultiSigMasterWallet } from 'src/app/wallet/model/masterwallets/standard.multisig.masterwallet';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { StandardBTCNetworkWallet } from 'src/app/wallet/model/networks/btc/networkwallets/standard/standard.btc.networkwallet';
import { MainChainSubWallet } from 'src/app/wallet/model/networks/elastos/mainchain/subwallets/mainchain.subwallet';
import { Utxo } from 'src/app/wallet/model/tx-providers/transaction.types';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { Transfer } from 'src/app/wallet/services/cointransfer.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { Config } from '../../../config/Config';
import { MasterWallet, StandardMasterWallet } from '../../../model/masterwallets/masterwallet';
import { AuthService } from '../../../services/auth.service';
import { CurrencyService } from '../../../services/currency.service';
import { Native } from '../../../services/native.service';
import { LocalStorage } from '../../../services/storage.service';
import { WalletService } from '../../../services/wallet.service';
import { WalletEditionService } from '../../../services/walletedition.service';

type SettingsMenuEntry = {
    type: string;
    route?: string;
    navCallback?: () => void;
    title: string;
    subtitle: string;
    icon: string;
    iconDarkmode: string;
}

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

    public settings: SettingsMenuEntry[] = [
        {
            type: 'wallet-name',
            route: "/wallet/wallet-edit-name",
            title: this.translate.instant("wallet.wallet-settings-change-name"),
            subtitle: this.translate.instant("wallet.wallet-settings-change-name-subtitle"),
            icon: '/assets/wallet/settings/pen.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/pen.svg'
        },
        /* {
            type: 'wallet-color',
            route: "/wallet/wallet-color",
            title: this.translate.instant("wallet.wallet-settings-change-theme"),
            subtitle: this.translate.instant("wallet.wallet-settings-change-theme-subtitle"),
            icon: '/assets/wallet/settings/picture.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/picture.svg'
        }, */
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
        public events: GlobalEvents,
        public localStorage: LocalStorage,
        public globalPopupService: GlobalPopupService,
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

    ngOnInit() {
        this.masterWalletId = this.walletEditionService.modifiedMasterWalletId;
        if (!this.masterWalletId) {
            this.masterWalletId = this.walletManager.getActiveMasterWallet().id;
        }
        this.masterWallet = this.walletManager.getMasterWallet(this.masterWalletId);
        this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.masterWalletId);
        this.canExportKeystore = false; // TODO - repair - export "private key" keystores, not "elastos keystores" //this.masterWallet.createType === WalletCreateType.MNEMONIC || this.masterWallet.createType === WalletCreateType.KEYSTORE;
        Logger.log('wallet', 'Settings for master wallet - ' + this.networkWallet);

        if (this.networkWallet) {
            if (this.networkWallet.canBackupWallet()) {
                this.settings.unshift({
                    type: 'wallet-export',
                    navCallback: () => {
                        if (this.canExportKeystore) {
                            this.showExportMenu = !this.showExportMenu;
                        } else {
                            void this.export();
                        }
                    },
                    title: this.translate.instant("wallet.wallet-settings-backup-wallet"),
                    subtitle: this.translate.instant("wallet.wallet-settings-backup-wallet-subtitle"),
                    icon: '/assets/wallet/settings/key.svg',
                    iconDarkmode: '/assets/wallet/settings/darkmode/key.svg'
                });
            }

            if (this.networkWallet.network.supportsERC20Coins() || this.networkWallet.network.supportsTRC20Coins()) {
                this.settings.push({
                    type: 'coin-list',
                    route: "/wallet/coin-list",
                    title: this.translate.instant("wallet.wallet-settings-manage-coin-list"),
                    subtitle: this.translate.instant("wallet.wallet-settings-manage-coin-list-subtitle"),
                    icon: '/assets/wallet/settings/coins.svg',
                    iconDarkmode: '/assets/wallet/settings/darkmode/coins.svg'
                });
            }

            if (this.masterWallet instanceof StandardMultiSigMasterWallet) {
                this.settings.push({
                    type: 'wallet-ext-pub-keys',
                    navCallback: () => {
                        this.native.go("/wallet/multisig/standard/info", {
                            masterWalletId: this.masterWalletId
                        });
                    },
                    title: this.translate.instant("wallet.wallet-settings-multisig-extended-public-keys-title"),
                    subtitle: this.translate.instant("wallet.wallet-settings-multisig-extended-public-keys-subtitle"),
                    icon: '/assets/wallet/settings/picture.svg',
                    iconDarkmode: '/assets/wallet/settings/darkmode/picture.svg'
                });
            } else {
                if (this.networkWallet.getExtendedPublicKey()) {
                    this.settings.push({
                        type: 'wallet-ext-pub-keys',
                        navCallback: () => {
                            this.native.go("/wallet/wallet-ext-pub-keys", {
                                masterWalletId: this.masterWalletId
                            });
                        },
                        title: this.translate.instant("wallet.wallet-settings-extended-public-keys-title"),
                        subtitle: this.translate.instant("wallet.wallet-settings-extended-public-keys-subtitle"),
                        icon: '/assets/wallet/settings/picture.svg',
                        iconDarkmode: '/assets/wallet/settings/darkmode/picture.svg'
                    });
                }
            }

            // TODO: Support to change address type for Ledger wallet.
            if (this.networkWallet instanceof StandardBTCNetworkWallet) {
                this.settings.push({
                  type: 'wallet-switch-address-type',
                  navCallback: () => {
                      void this.pickAddressType();
                  },
                  title: this.translate.instant("wallet.wallet-settings-switch-address-type-title"),
                  subtitle: this.networkWallet.getAddresses()[0]?.title,
                  icon: '/assets/wallet/icons/change-wallet.svg',
                  iconDarkmode: '/assets/wallet/icons/darkmode/change-wallet.svg'
              });
            }
        }

        this.settings.push({
            type: 'wallet-delete',
            navCallback: () => {
                void this.onDelete();
            },
            title: this.translate.instant("wallet.wallet-settings-delete-wallet"),
            subtitle: this.translate.instant("wallet.wallet-settings-delete-wallet-subtitle"),
            icon: '/assets/wallet/settings/trash.svg',
            iconDarkmode: '/assets/wallet/settings/darkmode/trash.svg'
        });

        if (this.networkWallet && this.walletNetworkService.isActiveNetworkElastosMainchain()) {
            this.settings.push({
                type: 'wallet-consolidate-utxos',
                navCallback: () => {
                    void this.checkUtxosCount();
                },
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

    ionViewWillLeave() {
        void this.native.hideLoading();
    }

    async onDelete() {
        try {
            const payPassword = await this.authService.getWalletPassword(this.masterWalletId, true, true);
            // In case of: The payPassword is undefined, if the password is missing.
            if (payPassword || payPassword === undefined) {
                void this.showDeletePrompt();
            }
        } catch (e) {
            Logger.error('wallet', 'onDelete getWalletPassword error:' + e);
        }
    }

    private async checkUtxosCount() {
        let normalUxtos: Utxo[] = null;
        let utxosCount = -1;
        let mainChainSubwallet = this.networkWallet.getSubWallet(StandardCoinName.ELA) as any as MainChainSubWallet

        await this.native.showLoading(this.translate.instant('common.please-wait'));
        try {
            normalUxtos = await mainChainSubwallet.getNormalUtxos();
            utxosCount = normalUxtos.length;
        } catch (err) {
            Logger.warn('wallet', ' getNormalUtxos error', err)
        }
        await this.native.hideLoading();

        if (utxosCount > Config.UTXO_CONSOLIDATE_MIN_THRESHOLD) {
            const UTXOsCountString = this.translate.instant('wallet.text-consolidate-UTXO-counts', { count: utxosCount });
            let ret = await this.globalPopupService.ionicConfirmWithSubTitle('wallet.text-consolidate-prompt',
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

                    await mainChainSubwallet.signAndSendRawTransaction(rawTx, transfer);
                }
            }
        } else {
            this.globalNative.genericToast('wallet.wallet-settings-consolidate-no-need')
        }
    }

    async showDeletePrompt() {
        this.popover = await this.popoverCtrl.create({
            mode: 'ios',
            cssClass: 'wallet-warning-component',
            component: WarningComponent,
            componentProps: {
                title: this.translate.instant('wallet.delete-wallet-confirm-title'),
                message: this.translate.instant('wallet.delete-wallet-confirm-subtitle')
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

    public goToSetting(item: SettingsMenuEntry) {
        if (item.navCallback)
            item.navCallback();
        else
            this.native.go(item.route);
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

    // For Btc address type
    private buildBTCAddressTypeMenuItems(): MenuSheetMenu[] {
        return [
            {
                title: "Native Segwit",
                routeOrAction: () => {
                  void this.switchBTCAddressType(BitcoinAddressType.NativeSegwit);
                }
            },
            {
                title: "Legacy",
                routeOrAction: () => {
                  void this.switchBTCAddressType(BitcoinAddressType.Legacy);
                }
            },
            // TODO: Open it when support Taproot TX.
            {
                title: "Taproot",
                routeOrAction: () => {
                  void this.switchBTCAddressType(BitcoinAddressType.Taproot);
                }
            }
        ]
    }

    private async switchBTCAddressType(addressType: BitcoinAddressType) {
        let bitcoinAddressType = (this.masterWallet as StandardMasterWallet).getBitcoinAddressType();
        if (bitcoinAddressType != addressType) {
            await (this.masterWallet as StandardMasterWallet).setBitcoinAddressType(addressType);
            await this.walletManager.activateMasterWallet(this.masterWallet);
            this.native.setRootRouter("/wallet/wallet-home");
        }
    }

    /**
     * Choose an address type
     */
    public pickAddressType() {
        let menuItems: MenuSheetMenu[] = this.buildBTCAddressTypeMenuItems();

        let menu: MenuSheetMenu = {
            title: GlobalTranslationService.instance.translateInstant("wallet.ledger-choose-address-type"),
            items: menuItems
        };

        void this.globalNative.showGenericBottomSheetMenuChooser(menu);
    }
}
