import { Component, OnInit, ViewChild } from '@angular/core';
import { IonInput } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Util } from 'src/app/model/util';
import { GlobalStartupService } from 'src/app/services/global.startup.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { Native } from 'src/app/wallet/services/native.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';

@Component({
    selector: 'app-std-multisig-create',
    templateUrl: './std-multisig-create.page.html',
    styleUrls: ['./std-multisig-create.page.scss'],
})
export class StandardMultiSigCreatePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
    @ViewChild('input', { static: false }) input: IonInput;

    public wallet = {
        name: '',
        singleAddress: false, // TODO: network options
    };

    public useBackNav = false;

    constructor(
        public translate: TranslateService,
        private theme: GlobalThemeService,
        private native: Native,
        private walletService: WalletService,
        private globalStartupService: GlobalStartupService
    ) {
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setTheme('#732cd0', TitleBarForegroundMode.LIGHT)
        this.titleBar.setTitle('New multi-sig wallet');
    }

    ionViewDidEnter() {
    }

    ionViewWillLeave() {
        this.theme.activeTheme.subscribe((activeTheme) => {
            this.titleBar.setTitleBarTheme(activeTheme);
        });
    }

    onCreate() {
        if (Util.isNull(this.wallet.name)) {
            this.native.toast_trans("wallet.text-wallet-name-validator-enter-name");
            return;
        }
        if (WalletUtil.isInvalidWalletName(this.wallet.name)) {
            this.native.toast_trans("wallet.text-wallet-name-validator-not-valid-name");
            return;
        }
        if (this.walletService.walletNameExists(this.wallet.name)) {
            this.native.toast_trans("wallet.text-wallet-name-validator-already-exists");
            return;
        }

        void this.createWallet();
    }

    async createWallet() {
        let walletId = this.walletService.createMasterWalletID();
        let testWallet = await this.walletService.newMultiSigStandardWallet(
            walletId,
            this.wallet.name,
            this.walletService.getMasterWalletsList()[0].id, // TODO: for now hardcoding to use a random master wallet
            2, // TODO: hardcoded
            [
                // TODO: hardcoded for tests - expected BTC P2SH address: 36NUkt6FWUi3LAWBqWRdDmdTWbt91Yvfu7
                '026477115981fe981a6918a6297d9803c4dc04f328f22041bedff886bbc2962e01',
                '02c96db2302d19b43d4c69368babace7854cc84eb9e061cde51cfa77ca4a22b8b9',
                '03c6103b3b83e4a24a0e33a4df246ef11772f9992663db0c35759a5e2ebf68d8e9',
            ]
        );

        // TEST PUBLISH HERE
        console.log("testWallet multisig", testWallet);


        /*  this.walletCreationService.name = this.wallet.name;
         this.walletCreationService.singleAddress = this.wallet.singleAddress;
         if (this.useMenmonicPassphrase) {
             this.walletCreationService.mnemonicPassword = this.wallet.mnemonicPassword;
         } else {
             this.walletCreationService.mnemonicPassword = '';
         }

         if (this.walletCreationService.type === 1) {
             this.native.go("/wallet/mnemonic/create");
         } else {
             if (this.importByPrivateKey) {
                 this.native.go('/wallet/wallet-import-privatekey');
             } else {
                 this.native.go("/wallet/wallet-import");
             }
         } */
    }
}
