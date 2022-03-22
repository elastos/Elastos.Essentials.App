import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Keyboard } from '@awesome-cordova-plugins/keyboard/ngx';
import { IonInput, IonSlides, ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { Events } from 'src/app/services/events.service';
import { GlobalMnemonicKeypadService } from 'src/app/services/global.mnemonickeypad.service';
import { AuthService } from '../../../../services/auth.service';
import { Native } from '../../../../services/native.service';
import { WalletService } from '../../../../services/wallet.service';
import { WalletCreationService } from '../../../../services/walletcreation.service';

@Component({
    selector: 'app-mnemonic-write',
    templateUrl: './mnemonic-write.page.html',
    styleUrls: ['./mnemonic-write.page.scss'],
})
export class MnemonicWritePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
    @ViewChild('slider', { static: false }) slider: IonSlides;
    @ViewChild('input', { static: false }) input: IonInput;

    slideOpts = {
        initialSlide: 0,
        speed: 400,
        centeredSlides: true,
        slidesPerView: 1
    };

    public inputList: string[] = [];
    public keypadShown = false;
    private mnemonicStrToVerify = "";

    constructor(
        public route: ActivatedRoute,
        public authService: AuthService,
        public native: Native,
        public events: Events,
        public walletManager: WalletService,
        private walletCreationService: WalletCreationService,
        public zone: NgZone,
        private modalCtrl: ModalController,
        private translate: TranslateService,
        private mnemonicKeypadService: GlobalMnemonicKeypadService,
        public keyboard: Keyboard
    ) {
        this.mnemonicStrToVerify = Util.clone(this.walletCreationService.mnemonicStr);
    }

    ngOnInit() {
        Logger.log('wallet', 'Empty input list created', this.inputList);
    }

    ionViewWillEnter() {
        this.titleBar.setBackgroundColor('#732cd0');
        this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
        this.titleBar.setTitle(this.translate.instant('wallet.mnemonic-check-title'));
    }

    ionViewDidEnter() {
    }

    slideNext(slide) {
        slide.slideNext();
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
            void this.onCreate();
        }
    }

    allInputsFilled() {
        return this.inputList.length === 12;
    }

    private getMnemonicAsString(): string {
        return this.inputList.join(" ").toLowerCase();
    }

    async onCreate() {
        if (this.allInputsFilled()) {
            // if (true) { // for test
            if (this.getMnemonicAsString().replace(/\s+/g, "").toLowerCase() === this.mnemonicStrToVerify.replace(/\s+/g, "")) {
                if (this.walletCreationService.isMulti) {
                    this.native.go("/wallet/mpublickey");
                } else {
                    this.native.toast_trans('wallet.mnemonic-verify-sucess');

                    const payPassword = await this.authService.createAndSaveWalletPassword(this.walletCreationService.masterId);
                    if (payPassword) {
                        try {
                            await this.native.showLoading(this.translate.instant('common.please-wait'));
                            await this.walletManager.createNewMasterWallet(
                                this.walletCreationService.masterId,
                                this.walletCreationService.name,
                                this.getMnemonicAsString(),
                                this.walletCreationService.mnemonicPassword,
                                payPassword,
                                this.walletCreationService.singleAddress
                            );
                            await this.native.hideLoading();

                            this.events.publish("masterwalletcount:changed", {
                                action: 'add',
                                walletId: this.walletCreationService.masterId
                            });
                        } catch (err) {
                            await this.native.hideLoading();
                            Logger.error('wallet', 'Wallet create error:', err);
                        }
                    }
                }

            } else {
                this.inputList = [];
                this.updateSliderPosition();
                this.native.toast_trans('wallet.mnemonic-verify-fail');
            }
        } else {
            this.inputList = [];
            this.updateSliderPosition();
            this.native.toast(this.translate.instant("wallet.mnemonic-import-missing-words"));
        }
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

    private onMnemonicPaste(pastedMnemonicString: string) {
        // Paste does nothing - forbidden in verification mode
    }

    private onMnemonicWordsListUpdate(words: string[]) {
        this.inputList = words;
        this.updateSliderPosition();
    }

    public async showMnemonicInputKeypad() {
        this.inputList = [];
        this.updateSliderPosition();

        await this.mnemonicKeypadService.promptMnemonic(12, words => {
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

