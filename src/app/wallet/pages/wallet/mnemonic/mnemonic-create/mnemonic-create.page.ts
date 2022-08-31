import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonSlides } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { WalletPrefsService } from 'src/app/wallet/services/pref.service';
import { TitleBarForegroundMode } from '../../../../../components/titlebar/titlebar.types';
import { Native } from '../../../../services/native.service';
import { LocalStorage } from '../../../../services/storage.service';
import { WalletService } from '../../../../services/wallet.service';
import { SelectableMnemonic, WalletCreationService } from '../../../../services/walletcreation.service';

@Component({
    selector: 'app-mnemonic-create',
    templateUrl: './mnemonic-create.page.html',
    styleUrls: ['./mnemonic-create.page.scss'],
})
export class MnemonicCreatePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
    @ViewChild('slider', { static: false }) slider: IonSlides;

    slideOpts = {
        initialSlide: 0,
        speed: 400,
        centeredSlides: true,
        slidesPerView: 1
    };

    masterWalletId = "1";
    mnemonicList: SelectableMnemonic[] = [];
    mnemonicStr: string;

    constructor(
        public route: ActivatedRoute,
        public walletManager: WalletService,
        public native: Native,
        public localStorage: LocalStorage,
        public events: GlobalEvents,
        public zone: NgZone,
        private walletCreationService: WalletCreationService,
        private translate: TranslateService,
        private prefs: WalletPrefsService
    ) {
        void native.showLoading().then(() => {
            void this.init();
        });
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        // titleBarManager.setBackgroundColor('#732cd0');
        this.titleBar.setBackgroundColor('#732cd0');
        this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
        this.titleBar.setTitle(this.translate.instant('common.mnemonic'));
    }

    async init() {
        this.masterWalletId = this.walletManager.createMasterWalletID();
        this.mnemonicStr = await this.walletManager.spvBridge.generateMnemonic(this.prefs.getMnemonicLang());
        void this.native.hideLoading();
        let mnemonicArr = this.mnemonicStr.split(/[\u3000\s]+/);
        this.zone.run(() => {
            for (var i = 0; i < mnemonicArr.length; i++) {
                this.mnemonicList.push({ text: mnemonicArr[i], selected: false });
            }
        });
    }

    goToMnemonicWrite() {
        this.walletCreationService.masterId = this.masterWalletId;
        this.walletCreationService.mnemonicStr = this.mnemonicStr;
        this.walletCreationService.mnemonicList = this.mnemonicList;

        // this.walletCreationService.mnemonicPassword = this.mnemonicPassword;

        this.native.go("/wallet/mnemonic/write");
    }

    nextSlide(slide) {
        slide.slideNext();
    }
}

