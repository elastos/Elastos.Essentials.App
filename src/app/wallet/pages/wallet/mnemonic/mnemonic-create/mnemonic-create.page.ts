import { Component, OnInit, NgZone, ViewChild } from '@angular/core';
import { NavParams, IonSlides } from '@ionic/angular';
import { Native } from '../../../../services/native.service';
import { WalletManager } from '../../../../services/wallet.service';
import { Util } from '../../../../model/Util';
import { LocalStorage } from '../../../../services/storage.service';
import { ActivatedRoute } from '@angular/router';
import { WalletCreationService, SelectableMnemonic } from '../../../../services/walletcreation.service';
import { TranslateService } from '@ngx-translate/core';
import { Events } from '../../../../services/events.service';
import { TitleBarForegroundMode } from '../../../../../components/titlebar/titlebar.types';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';

@Component({
    selector: 'app-mnemonic-create',
    templateUrl: './mnemonic-create.page.html',
    styleUrls: ['./mnemonic-create.page.scss'],
})
export class MnemonicCreatePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
    @ViewChild('slider', {static: false}) slider: IonSlides;

    slideOpts = {
        initialSlide: 0,
        speed: 400,
        centeredSlides: true,
        slidesPerView: 1
    };

    masterWalletId: string = "1";
    mnemonicList: SelectableMnemonic[] = [];
    mnemonicStr: string;

    constructor(
        public route: ActivatedRoute,
        public walletManager: WalletManager,
        public native: Native,
        public localStorage: LocalStorage,
        public events: Events,
        public zone: NgZone,
        private walletCreationService: WalletCreationService,
        private translate: TranslateService
    ) {
        native.showLoading().then(() => {
            this.init();
        });
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        // titleBarManager.setBackgroundColor('#732cd0');
        this.titleBar.setBackgroundColor('#6B26C6');
        this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
        this.titleBar.setTitle(this.translate.instant('mnemonic'));
    }

    async init() {
        this.masterWalletId = Util.uuid(6, 16);
        this.mnemonicStr = await this.walletManager.spvBridge.generateMnemonic(this.native.getMnemonicLang());
        this.native.hideLoading();
        let mnemonicArr = this.mnemonicStr.split(/[\u3000\s]+/);
        this.zone.run(()=>{
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

        this.native.go("/mnemonic-write");
    }

    nextSlide(slide) {
        slide.slideNext();
    }
}

