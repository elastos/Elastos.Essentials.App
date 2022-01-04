import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Native } from 'src/app/identity/services/native';
import { Util } from 'src/app/model/util';
import { Events } from 'src/app/services/events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Config } from 'src/app/wallet/config/Config';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { WalletAccessService } from 'src/app/wallet/services/walletaccess.service';
import { WalletEditionService } from 'src/app/wallet/services/walletedition.service';


@Component({
    selector: 'app-wallet-keystore-export',
    templateUrl: './wallet-keystore-export.page.html',
    styleUrls: ['./wallet-keystore-export.page.scss'],
})
export class KeystoreExportPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public title = '';
    public payPassword = '';
    public keystorePassword = '';
    public keystorePasswordRepeat = '';
    public masterWalletId = '';
    public hasMnemonic = true;
    public keystore = '';

    constructor(
        public router: Router,
        public walletManager: WalletService,
        public zone: NgZone,
        private walletEditionService: WalletEditionService,
        public native: Native,
        public events: Events,
        public theme: GlobalThemeService,
        private translate: TranslateService,
        private walletAccessService: WalletAccessService
    ) {
        this.init();
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setBackgroundColor('#732cd0');
        this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
        this.titleBar.setTitle(this.translate.instant('wallet.keystore-title'));
    }

    init() {
        const navigation = this.router.getCurrentNavigation();
        this.zone.run(() => {
            if (!Util.isEmptyObject(navigation.extras.state)) {
                if (navigation.extras.state.payPassword) {
                    this.masterWalletId = this.walletEditionService.modifiedMasterWalletId;
                    this.payPassword = navigation.extras.state.payPassword;
                } else {
                    this.masterWalletId = this.walletAccessService.masterWalletId;
                }
            } else {
                this.masterWalletId = this.walletEditionService.modifiedMasterWalletId;
            }

            const masterWallet = this.walletManager.getMasterWallet(this.masterWalletId);
            // this.hasMnemonic = masterWallet.createType === WalletCreateType.MNEMONIC
            //     || masterWallet.createType === WalletCreateType.KEYSTORE;
        });
    }

    checkPassword() {
        if (this.keystorePassword.length < Config.MIN_PASSWORD_LENGTH) {
            this.native.toast_trans("wallet.keystore-password-validator-min-length");
            return false;
        }
        if (this.keystorePassword !== this.keystorePasswordRepeat) {
            this.native.toast_trans("wallet.keystore-password-validator-repeat");
            return false;
        }
        return true;
    }

    async export() {
        if (this.checkPassword()) {
            this.keystore = await this.walletManager.spvBridge.exportWalletWithKeystore(this.masterWalletId, this.keystorePassword, this.payPassword);
        }
    }

    copyKeystore() {
        void this.native.copyClipboard(this.keystore);
        this.native.toast(this.translate.instant("common.copied-to-clipboard"));
    }
}