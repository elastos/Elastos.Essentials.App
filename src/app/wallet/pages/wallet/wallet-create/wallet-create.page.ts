import { Component, OnInit, NgZone, ViewChild } from '@angular/core';
import { Util } from "../../../model/Util";
import { Native } from '../../../services/native.service';
import { Config } from '../../../config/Config';
import { ActivatedRoute } from '@angular/router';
import { WalletManager } from '../../../services/wallet.service';
import { WalletCreationService, NewWallet } from '../../../services/walletcreation.service';
import { TranslateService } from '@ngx-translate/core';
import { UiService } from '../../../services/ui.service';
import { IonInput } from '@ionic/angular';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';

@Component({
    selector: 'app-wallet-create',
    templateUrl: './wallet-create.page.html',
    styleUrls: ['./wallet-create.page.scss'],
})
export class WalletCreatePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
    @ViewChild('input', {static: false}) input: IonInput;

    public useMenmonicPassphrase = true;
    public wallet = {
        name: '',
        singleAddress: false,
        mnemonicPassword: ''
    };
    public repeatMnemonicPassword: '';

    constructor(
        public route: ActivatedRoute,
        public native: Native,
        private walletManager: WalletManager,
        public walletCreationService: WalletCreationService,
        public zone: NgZone,
        public translate: TranslateService,
        public uiService: UiService
    ) {
        if (this.walletCreationService.isMulti) {
            this.wallet.singleAddress = true;
        }
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setBackgroundColor('#732cd0');
        this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
        if (this.walletCreationService.type === NewWallet.CREATE) {
            this.titleBar.setTitle(this.translate.instant('wallet.launcher-create-wallet'));
        } else {
            this.titleBar.setTitle(this.translate.instant('wallet.launcher-backup-import'));
        }
    }

    ionViewWillLeave() {
        if (this.native.popup) {
            this.native.popup.dismiss();
        }
    }

    updateSingleAddress(event) {
        // this.wallet.singleAddress = event.detail.checked;
        Logger.log('wallet', 'Single address toggled?', + this.wallet.singleAddress, event);
    }

    onCreate() {
        if (Util.isNull(this.wallet.name)) {
            this.native.toast_trans("wallet.text-wallet-name-validator-enter-name");
            return;
        }
        if (Util.isWalletName(this.wallet.name)) {
            this.native.toast_trans("wallet.text-wallet-name-validator-not-valid-name");
            return;
        }
        if (this.walletManager.walletNameExists(this.wallet.name)) {
            this.native.toast_trans("wallet.text-wallet-name-validator-already-exists");
            return;
        }
        if (this.useMenmonicPassphrase) {
            if (this.wallet.mnemonicPassword.length < Config.MIN_PASSWORD_LENGTH) {
                this.native.toast_trans("wallet.text-wallet-passphrase-validator-min-length");
                return;
            }
            if (this.walletCreationService.type === NewWallet.CREATE && this.wallet.mnemonicPassword !== this.repeatMnemonicPassword) {
                this.native.toast_trans("wallet.text-wallet-passphrase-validator-repeat");
                return;
            }
        }
        this.createWallet();
    }

    createWallet() {
        this.walletCreationService.name = this.wallet.name;
        this.walletCreationService.singleAddress = this.wallet.singleAddress;
        if (this.useMenmonicPassphrase) {
            this.walletCreationService.mnemonicPassword = this.wallet.mnemonicPassword;
        } else {
            this.walletCreationService.mnemonicPassword = '';
        }

        if (this.walletCreationService.type === 1) {
            this.native.go("/wallet/mnemonic/create");
        } else {
            this.native.go("/wallet/wallet-import");
        }
    }

    goToNextInput(event, nextInput: any) {
        // android: only press enter will trigger keypress event
        // ios: press any key will trigger keypress event
        if (event !== 13) {
            return;
        }

        if (this.wallet.mnemonicPassword.length < Config.MIN_PASSWORD_LENGTH) {
            this.native.toast_trans("wallet.text-wallet-passphrase-validator-min-length");
            return;
        }
        nextInput.setFocus();
    }

    showHelp(event) {
        this.walletCreationService.type === 1 ?
            this.native.showHelp(event, 'wallet.help:create-password') :
            this.native.showHelp(event, 'wallet.help:import-password');
    }
}
