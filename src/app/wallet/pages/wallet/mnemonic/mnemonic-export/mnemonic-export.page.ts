import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { Events } from 'src/app/services/events.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { StandardMasterWallet } from 'src/app/wallet/model/masterwallets/masterwallet';
import { AuthService } from '../../../../services/auth.service';
import { IntentTransfer } from '../../../../services/cointransfer.service';
import { Native } from '../../../../services/native.service';
import { WalletService } from '../../../../services/wallet.service';
import { WalletAccessService } from '../../../../services/walletaccess.service';
import { WalletEditionService } from '../../../../services/walletedition.service';

/**
 * Export wallet mnemonic screens.
 * Only for StandardMasterWallet wallets.
 */
@Component({
    selector: 'app-mnemonic-export',
    templateUrl: './mnemonic-export.page.html',
    styleUrls: ['./mnemonic-export.page.scss'],
})
export class MnemonicExportPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public title = '';
    public payPassword = '';
    public masterWalletId = "1";
    private masterWallet: StandardMasterWallet;
    public mnemonicList = [];
    public hideMnemonic = true;
    public isFromIntent = false;
    public mnemonicStr = "";
    public walletname = "";
    public hasMnemonic = true;
    public evmPrivateKey = '';
    public intentTransfer: IntentTransfer;

    constructor(
        public router: Router,
        public walletManager: WalletService,
        public zone: NgZone,
        private walletEditionService: WalletEditionService,
        private globalIntentService: GlobalIntentService,
        public native: Native,
        public events: Events,
        private authService: AuthService,
        public theme: GlobalThemeService,
        private translate: TranslateService,
        private walletAccessService: WalletAccessService
    ) {
        this.init();
    }

    ngOnInit() {
        this.titleBar.setTitle(this.translate.instant('wallet.wallet-settings-backup-wallet'));
        if (this.isFromIntent) {
            this.titleBar.setNavigationMode(null);
        }
    }

    ionViewWillEnter() {
        if (this.hasMnemonic) {
            void this.showMnemonics();
        } else {
            this.hideMnemonic = false;
        }

        void this.showPrivateKey();
    }

    init() {
        const navigation = this.router.getCurrentNavigation();
        this.zone.run(() => {
            if (!Util.isEmptyObject(navigation.extras.state)) {
                if (navigation.extras.state.payPassword) {
                    this.masterWalletId = this.walletEditionService.modifiedMasterWalletId;
                    this.payPassword = navigation.extras.state.payPassword;
                } else {
                    Logger.log('wallet', 'From intent');
                    this.isFromIntent = true;
                    this.intentTransfer = this.walletAccessService.intentTransfer;
                    this.masterWalletId = this.walletAccessService.masterWalletId;
                    this.title = 'wallet.access-mnemonic';
                }
            } else {
                this.title = 'wallet.text-export-mnemonic';
                this.masterWalletId = this.walletEditionService.modifiedMasterWalletId;
            }

            this.masterWallet = this.walletManager.getMasterWallet(this.masterWalletId) as StandardMasterWallet;
            this.walletname = this.masterWallet.name;
            this.hasMnemonic = this.masterWallet.hasMnemonicSupport();
        });
    }

    async getPassword() {
        try {
            this.payPassword = await this.authService.getWalletPassword(this.masterWalletId, true, true);
            if (this.payPassword) {
                return true;
            } else {
                return false;
            }
        } catch (e) {
            Logger.error('wallet', 'MnemonicExportPage getWalletPassword error:' + e);
            return false;
        }
    }

    async onExport() {
        if (await this.getPassword()) {
            if (this.hasMnemonic) {
                void this.showMnemonics();
            } else {
                void this.showPrivateKey();
            }
        } else {
            // User cancel
            Logger.log('wallet', 'MnemonicExportPage user cancel');
            await this.globalIntentService.sendIntentResponse(
                { txid: null, status: 'cancelled' },
                this.intentTransfer.intentId
            );
        }
    }

    showMnemonics() {
        this.titleBar.setBackgroundColor('#732cd0');
        this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
        this.titleBar.setTitle(this.translate.instant('common.mnemonic'));

        this.mnemonicStr = this.masterWallet.getMnemonic(this.payPassword);
        let mnemonicArr = this.mnemonicStr.split(/[\u3000\s]+/).filter(str => str.trim().length > 0);

        this.mnemonicList = [];
        for (let i = 0; i < mnemonicArr.length; i++) {
            this.mnemonicList.push(mnemonicArr[i]);
        }

        this.hideMnemonic = false;
    }

    showPrivateKey() {
        this.evmPrivateKey = this.masterWallet.getPrivateKey(this.payPassword); // TODO: this returns only EVM private keys for now
        if (!this.hasMnemonic) {
            this.titleBar.setBackgroundColor('#732cd0');
            this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
            this.titleBar.setTitle(this.translate.instant('wallet.privatekey'));
        }
    }

    async onShare() {
        await this.globalIntentService.sendIntentResponse(
            { mnemonic: this.mnemonicStr },
            this.intentTransfer.intentId
        );
    }

    return() {
        this.native.pop();
    }

    copyPrivateKey() {
        void this.native.copyClipboard(this.evmPrivateKey);
        this.native.toast(this.translate.instant("common.copied-to-clipboard"));
    }
}