import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { IonSlides } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { WalletExceptionHelper } from 'src/app/helpers/wallet.helper';
import { Logger } from 'src/app/logger';
import { WalletAlreadyExistException } from 'src/app/model/exceptions/walletalreadyexist.exception';
import { Util } from 'src/app/model/util';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalMnemonicKeypadService } from 'src/app/services/global.mnemonickeypad.service';
import { ElastosMainChainWalletNetworkOptions, WalletCreator } from 'src/app/wallet/model/masterwallets/wallet.types';
import { AuthService } from '../../../services/auth.service';
import { Native } from '../../../services/native.service';
import { PopupProvider } from '../../../services/popup.service';
import { LocalStorage } from '../../../services/storage.service';
import { WalletService } from '../../../services/wallet.service';
import { WalletCreationService } from '../../../services/walletcreation.service';

export enum MnemonicLanguage {
    CHINESE_SIMPLIFIED,
    OTHERS
}

@Component({
    selector: 'app-wallet-import',
    templateUrl: './wallet-import.page.html',
    styleUrls: ['./wallet-import.page.scss'],
})

export class WalletImportPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
    @ViewChild('slider', { static: false }) slider: IonSlides;

    slideOpts = {
        initialSlide: 0,
        speed: 400,
        centeredSlides: true,
        slidesPerView: 1
    };

    public slideIndex = 0;
    public keypadShown = false;

    public walletType: string;
    private masterWalletId = "1";

    private walletIsCreating = false; // Just in case, Ignore user action when the wallet is creating.

    public inputList: string[] = [];

    constructor(
        public walletService: WalletService,
        public native: Native,
        public localStorage: LocalStorage,
        public events: GlobalEvents,
        public popupProvider: PopupProvider,
        public zone: NgZone,
        private authService: AuthService,
        private translate: TranslateService,
        private walletCreationService: WalletCreationService,
        private mnemonicKeypadService: GlobalMnemonicKeypadService
    ) {
        this.masterWalletId = walletService.createMasterWalletID();
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('wallet.import-wallet'));
    }

    ionViewWillLeave() {
        void this.mnemonicKeypadService.dismissMnemonicPrompt();
    }

    slideNext(slider) {
        slider.slideNext();
    }

    goToNextInput(event, nextInput?: any, slide?: any) {
        // android: only press enter will trigger keypress event
        // ios: press any key will trigger keypress event
        if (event !== 13) {
            return;
        }

        if (nextInput) {
            if (slide) {
                slide.slideNext();
                setTimeout(() => {
                    nextInput.setFocus();
                }, 400);
            } else {
                nextInput.setFocus();
            }
        } else {
            void this.onImport();
        }
    }

    webKeyStore(webKeyStore) {
        Logger.log('wallet', "========webKeyStore" + webKeyStore);
    }

    allInputsFilled() {
        return this.inputList.length === 12;
    }

    async onImport() {
        if (this.allInputsFilled()) {
            if (this.walletIsCreating) {
                Logger.log('wallet', 'The wallet is creating, skip this action');
                return;
            }
            Logger.log('wallet', 'Input string is valid');
            this.walletIsCreating = true;
            try {
                const payPassword = await this.authService.createAndSaveWalletPassword(this.masterWalletId);
                if (payPassword) {
                    await this.native.showLoading(this.translate.instant('common.please-wait'));
                    await this.importWalletWithMnemonic(payPassword);
                    await this.native.hideLoading();
                }
            }
            catch (err) {
                Logger.error('wallet', 'Wallet import error:', err);
                // Wallet js sdk throw exception if the master wallet already exists.
                // So we should delete the wallet info from local storage.
                await this.localStorage.deleteMasterWallet(this.masterWalletId);
                let reworkedEx = WalletExceptionHelper.reworkedWalletJSException(err);
                if (reworkedEx instanceof WalletAlreadyExistException) {
                    await PopupProvider.instance.ionicAlert("common.error", "wallet.Error-20005");
                } else {
                    await PopupProvider.instance.ionicAlert("common.error", err.reason);
                }
            }
            await this.native.hideLoading();
            this.walletIsCreating = false;
        } else {
            this.native.toast(this.translate.instant("wallet.mnemonic-import-missing-words"));
        }
    }

    private getMnemonicAsString(): string {
        return this.inputList.join(" ").toLowerCase();
    }

    async importWalletWithMnemonic(payPassword: string) {
        let elastosNetworkOptions: ElastosMainChainWalletNetworkOptions = {
            network: "elastos", // mainchain
            singleAddress: this.walletCreationService.singleAddress
        };

        // Trim leading and trailing spaces for each word
        Logger.log('wallet', 'Importing with mnemonic');
        await this.walletService.newStandardWalletWithMnemonic(
            this.masterWalletId,
            this.walletCreationService.name,
            this.getMnemonicAsString(),
            this.walletCreationService.mnemonicPassword,
            payPassword,
            [elastosNetworkOptions],
            WalletCreator.USER
        );
        this.native.setRootRouter("/wallet/wallet-home");

        this.events.publish("masterwalletcount:changed", {
            action: 'add',
            walletId: this.masterWalletId
        });

        this.native.toast_trans('wallet.import-text-word-sucess');
    }

    ionSlideDidChange() {
        void this.zone.run(async () => {
            this.slideIndex = await this.slider.getActiveIndex();
        });
    }

    /**
     * Receives a mnemonic strings and splits it into distinct words.
     *
     * @param pastedMnemonicString A string that is theoretically a mnemonic string, with or without spaces between words (eg chinese)
     */
    private onMnemonicPaste(pastedMnemonicString: string) {
        let chineseMnemonic = Util.chinese(pastedMnemonicString[0]);
        if (chineseMnemonic) {
            // Chinese mnemonics are possibly entered without spaces.
            pastedMnemonicString = pastedMnemonicString.replace(/ /g, '');
            for (let i = 0; i < pastedMnemonicString.length; i++) {
                this.inputList.push(pastedMnemonicString[i]);
            }
        } else {
            this.inputList = pastedMnemonicString.split(" ").filter(item => item !== '');
        }

        this.updateSliderPosition();
    }

    private onMnemonicWordsListUpdate(words: string[]) {
        this.inputList = words;
        this.updateSliderPosition();
    }

    /**
     * Automatically slide to the right slide page according to the last mnemonoc word entered.
     */
    private updateSliderPosition() {
        if (this.inputList.length < 4)
            void this.slider.slideTo(0);
        else if (this.inputList.length < 8)
            void this.slider.slideTo(1);
        else
            void this.slider.slideTo(2);
    }

    public async showMnemonicInputKeypad() {
        this.updateSliderPosition();

        await this.mnemonicKeypadService.promptMnemonic(12, this.inputList, words => {
            this.onMnemonicWordsListUpdate(words);
        }, pasted => {
            this.onMnemonicPaste(pasted);
        }, () => {
            this.keypadShown = true;
        });
        this.keypadShown = false;
    }

    public getMnemonicWord(index: number): string {
        if (this.inputList.length <= index)
            return "";
        else
            return this.inputList[index];
    }
}
