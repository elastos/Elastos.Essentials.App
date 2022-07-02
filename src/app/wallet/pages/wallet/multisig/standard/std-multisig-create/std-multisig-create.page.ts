import { Component, OnInit, ViewChild } from '@angular/core';
import { IonInput } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import * as bs58check from "bs58check";
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { MasterWallet, StandardMasterWallet } from 'src/app/wallet/model/masterwallets/masterwallet';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { AuthService } from 'src/app/wallet/services/auth.service';
import { Native } from 'src/app/wallet/services/native.service';
import { LocalStorage } from 'src/app/wallet/services/storage.service';
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
        public theme: GlobalThemeService,
        private native: Native,
        private walletService: WalletService,
        private walletUIService: WalletUIService,
        private events: GlobalEvents,
        private authService: AuthService,
        public localStorage: LocalStorage
    ) {
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('wallet.multi-sig-new-wallet-title'));
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
            this.native.toast_trans('wallet.multi-sig-error-no-signing-wallet');
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
        try {
          await this.authService.createAndSaveWalletPassword(walletId);
          await this.walletService.newMultiSigStandardWallet(
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
        } catch (e) {
          Logger.error('wallet', 'MultiSigStandardWallet create error:', e);
          await this.localStorage.deleteMasterWallet(walletId);
        }
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
     * Only allow a mex number of cosigners to be added, not an infinite number.
     */
    public canAddCosigners(): boolean {
        return this.cosigners.length < 6;
    }

    /**
     * Pastes clipboard content into the target cosigner address
     */
    public async pasteCosigner(event, i: number) {
        let pastedContent = await this.native.pasteFromClipboard() as string;

        /* TODO: ensure valid xpub, or don't paste
         const isAddressValid = await this.isAddressValid(this.toAddress);
        if (!isAddressValid) {
            this.native.toast_trans('wallet.not-a-valid-address');
            return;
        } */
        if (!pastedContent.startsWith("xpub")) {
            this.native.toast_trans('wallet.multi-sig-error-invalid-xpub');
            return;
        }

        if (this.cosignersHaveKey(pastedContent)) {
            this.native.toast_trans('wallet.multi-sig-error-xpub-in-user');
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
      this.cosigners[i] = this.cosigners[i].trim();

      try {
        if (this.cosigners[i])
          bs58check.decode(this.cosigners[i]);
      } catch (e) {
        this.native.toast_trans('wallet.multi-sig-error-invalid-xpub');
      }
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
