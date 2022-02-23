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
import { WalletCreator } from 'src/app/wallet/model/masterwallets/wallet.types';
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

    public inputList: Array<any> = [];
    private inputStr = "";
    private mnemonicStr: string;

    private modal: any;

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
        public keyboard: Keyboard
    ) {
        this.mnemonicStr = Util.clone(this.walletCreationService.mnemonicStr);
    }

    ngOnInit() {
        for (let i = 0; i < 12; i++) {
            this.inputList.push({
                input: ''
            });
        }
        Logger.log('wallet', 'Empty input list created', this.inputList);
    }

    ionViewWillEnter() {
        this.titleBar.setBackgroundColor('#732cd0');
        this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
        this.titleBar.setTitle(this.translate.instant('wallet.mnemonic-check-title'));
    }

    ionViewDidEnter() {
        /*      setTimeout(() => {
                 this.input.setFocus();
             }, 200); */
    }

    /*     goToNextInput(event, nextInput?: any) {
            if (nextInput) {
                nextInput === 'input5' || nextInput === 'input9' ?
                    this.slider.slideNext().then(() => { nextInput.setFocus(); }) :
                    nextInput.setFocus();
            } else {
                this.onNext();
            }
        } */

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
        let inputsFilled = true;
        // return inputsFilled; // for test
        this.inputStr = '';
        this.inputList.forEach((word) => {
            if (word.input === '') {
                inputsFilled = false;
            } else {
                this.inputStr += word.input;
            }
        });
        return inputsFilled;
    }

    async onCreate() {
        if (this.allInputsFilled()) {
            // if (true) { // for test
            if (this.inputStr.replace(/\s+/g, "").toLowerCase() === this.mnemonicStr.replace(/\s+/g, "")) {
                if (this.walletCreationService.isMulti) {
                    this.native.go("/wallet/mpublickey");
                } else {
                    this.native.toast_trans('wallet.mnemonic-verify-sucess');

                    const payPassword = await this.authService.createAndSaveWalletPassword(this.walletCreationService.masterId);
                    if (payPassword) {
                        try {
                            await this.native.showLoading(this.translate.instant('common.please-wait'));
                            await this.walletManager.newWalletWithMnemonic(
                                this.walletCreationService.masterId,
                                this.walletCreationService.name,
                                this.mnemonicStr,
                                this.walletCreationService.mnemonicPassword,
                                payPassword,
                                this.walletCreationService.singleAddress,
                                WalletCreator.USER
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
                this.inputStr = "";
                this.native.toast_trans('wallet.mnemonic-verify-fail');
            }
        } else {
            this.inputStr = "";
            this.native.toast(this.translate.instant("wallet.mnemonic-import-missing-words"));
        }
    }
}

