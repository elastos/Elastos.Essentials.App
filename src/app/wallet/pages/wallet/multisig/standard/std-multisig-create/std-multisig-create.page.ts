import { Component, OnInit, ViewChild } from '@angular/core';
import { IonInput } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { Events } from 'src/app/services/events.service';
import { GlobalStartupService } from 'src/app/services/global.startup.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { MasterWallet, StandardMasterWallet } from 'src/app/wallet/model/masterwallets/masterwallet';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { AuthService } from 'src/app/wallet/services/auth.service';
import { Native } from 'src/app/wallet/services/native.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { WalletUIService } from 'src/app/wallet/services/wallet.ui.service';

@Component({
    selector: 'app-std-multisig-create',
    templateUrl: './std-multisig-create.page.html',
    styleUrls: ['./std-multisig-create.page.scss'],
})
export class StandardMultiSigCreatePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
    @ViewChild('input', { static: false }) input: IonInput;

    public signingWallet: MasterWallet = null; // Current user's wallet to sign multisig transactions. One of the cosigners.
    public cosigners = ['', '']; // Array of xpub cosigners keys - two empty keys by default
    public requiredSigners = 2; // Default

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
        private walletUIService: WalletUIService,
        private events: Events,
        private authService: AuthService,
        private globalStartupService: GlobalStartupService
    ) {
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        //this.titleBar.setTheme('#732cd0', TitleBarForegroundMode.LIGHT)
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
        if (Util.isNull(this.signingWallet)) {
            this.native.toast_trans("Please choose your signing wallet");
            return;
        }
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
        Logger.log("wallet", "Creating multisig wallet with signing wallet", this.signingWallet);

        let walletId = this.walletService.createMasterWalletID();
        await this.authService.createAndSaveWalletPassword(walletId);
        let testWallet = await this.walletService.newMultiSigStandardWallet(
            walletId,
            this.wallet.name,
            this.signingWallet.id,
            this.requiredSigners,
            this.getUsableCosigners()
        );

        this.native.setRootRouter("/wallet/wallet-home");

        this.events.publish("masterwalletcount:changed", {
            action: 'add',
            walletId: walletId
        });

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

    public allInputsValid(): boolean {
        if (!this.wallet.name)
            return false; // Need a wallet name

        if (!this.signingWallet)
            return false; // Need to have picked a signing wallet - no watch mode for now

        if (this.requiredSigners > this.getUsableCosigners().length)
            return false; // Can't have more signers required than total cosigners

        // TODO: no duplicate keys

        return true;
    }

    public async pickSigningWallet() {
        let pickedWallet = await this.walletUIService.pickWallet(networkWallet => {
            // Allow only wallets that can sign multisig wallets to show in the list
            if (!(networkWallet.masterWallet instanceof StandardMasterWallet))
                return false;

            if (!networkWallet.masterWallet.hasMnemonicSupport())
                return false;

            // TODO: probably need to filter more

            return true;
        });
        if (pickedWallet)
            this.signingWallet = pickedWallet.masterWallet;
    }

    /**
     * Remove empty cosigners from the list to get the real list of usable cosigners
     */
    public getUsableCosigners(): string[] {
        return this.cosigners.filter(c => c !== "");
    }

    /**
     * Add a new cosigner entry
     */
    public addCosignerEntry() {
        this.cosigners.push("");
    }

    /**
     * Pastes clipboard content into the target cosigner address
     */
    public async pasteCosigner(event, i: number) {
        let pastedContent = await this.native.pasteFromClipboard() as string;

        /* TODO: ensure valid xpub, or don't paste
         const isAddressValid = this.isAddressValid(this.toAddress);
        if (!isAddressValid) {
            this.native.toast_trans('wallet.not-a-valid-address');
            return;
        } */
        if (!pastedContent.startsWith("xpub")) {
            this.native.toast_trans('Please input a valid xpub key');
            return;
        }

        if (this.cosignersHaveKey(pastedContent)) {
            this.native.toast_trans('This key is already in the list, no duplicates can be used');
            return;
        }

        this.cosigners[i] = pastedContent;
    }

    /**
     * Ensure no duplicate
     */
    private cosignersHaveKey(key: string): boolean {
        return this.cosigners.includes(key);
    }

    public onCosignerBlur(i: number) {
        console.log("onCosignerBlur", i, this.cosigners[i]);
    }

    /**
     * Angular hack using 'trackBy' to not re-render the cosigners input list and lose keyboard focus
     * when typing.
     */
    public trackCosigners(index: number, item: any) {
        return index;
    }

    public onRequiredSignersUpdated() {

    }
}
