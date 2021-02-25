import { Component, NgZone, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NavController, IonInput, ModalController, Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

import { Util } from '../../services/util';
import { MnemonicPassCheckComponent } from 'src/app/didsessions/components/mnemonicpasscheck/mnemonicpasscheck.component';
import { UXService } from 'src/app/didsessions/services/ux.service';
import { ThemeService } from 'src/app/services/theme.service';
import { IdentityService, NavigateWithCompletionEnterData } from 'src/app/didsessions/services/identity.service';
import { PopupProvider } from 'src/app/didsessions/services/popup';
import { Events } from 'src/app/didsessions/services/events.service';

/**
 * Import algorithm:
 * - We can import from mnemonic (chain) or get mnemonic from wallet app (intent)
 * - We try to resolve on chain with optional mnemonic passphrase
 * - If resolve fails (ex: network error) -> error popup -> end
 * - if resolve succeeds with did document returned -> import
 * - if resolve succeeds with no data -> ask user to try to input passphrase again, or to create a profile anyway (will overwrite)
 */
@Component({
    selector: 'page-importdid',
    templateUrl: 'importdid.html',
    styleUrls: ['importdid.scss']
})
export class ImportDIDPage {
    private nextStepId: number;
    public loadingIdentity = false;
    public mnemonicWords = new Array<any>()
    public mnemonicSentence: string = "";
    //   public mnemonicSentence: string = "income diesel latin coffee tourist kangaroo lumber great ill amazing say left"; // TMP TESTNET
    private mnemonicForImport: string = "";
    private mnemonicLanguage: DIDPlugin.MnemonicLanguage;
    public readonly = false; // set true if import mnemonic form wallet app

    // for keyboard
    private rootContent: any;
    private sentenceInput: any;
    private showHandle: any;
    private hideHandle: any;
    private scrollHeight: Number = -1;
    public hideButton = false;

    @ViewChild('addMnemonicWordInput', { static: false }) addMnemonicWordInput: IonInput;

    constructor(
        public router: Router,
        public zone: NgZone,
        public platform: Platform,
        public navCtrl: NavController,
        private modalCtrl: ModalController,
        private identityService: IdentityService,
        private uxService: UXService,
        private translate: TranslateService,
        private popup: PopupProvider,
        private actRoute: ActivatedRoute,
        public theme: ThemeService,
        private events: Events,
    ) {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            if (!Util.isEmptyObject(navigation.extras.state.mnemonic)) {
                this.zone.run(() => {
                    console.log('mnemonic from router navigation', navigation.extras.state.mnemonic);
                    this.mnemonicSentence = navigation.extras.state.mnemonic;
                    this.onMnemonicSentenceChanged();
                    this.readonly = true;
                });
            }
        }
    }

    ngOnInit() {
        this.actRoute.queryParams.subscribe((params: {enterEvent:NavigateWithCompletionEnterData})=>{
            this.nextStepId = params.enterEvent.stepId;
        });

        this.events.subscribe('qrScanner', (qrData) => {
            console.log('qrScanner event', qrData.mnemonic);
            this.mnemonicSentence = qrData.mnemonic;
            this.onMnemonicSentenceChanged();
        })
    }

    ionViewWillEnter() {
        this.uxService.setTitleBarEditKeyShown(true);
        /* TODO @chad titleBarManager.setTitle(this.translate.instant('import-my-did'));

        titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_LEFT, {
          key: "backToHome",
          iconPath: TitleBarPlugin.BuiltInIcon.BACK
        });
        titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_RIGHT, {
          key: "scan",
          iconPath: TitleBarPlugin.BuiltInIcon.SCAN
        });
        */

        // the rootContent clientHeight is wrong in android?
        if (this.platform.platforms().indexOf('android') < 0) {
            this.getElements();

            window.addEventListener('native.keyboardshow', this.showHandle = (event: any)=> {
                if (this.scrollHeight == -1) {
                    this.scrollHeight = this.calcScrollHeight(event.keyboardHeight);
                }
                if (this.scrollHeight != 0) {
                    console.log('scrollHeight:', this.scrollHeight)
                    this.rootContent.style.top = this.scrollHeight + 'px';
                }
            });
            window.addEventListener('native.keyboardhide', this.hideHandle = () =>{
                this.rootContent.style.top = '0px';
            });
        }
    }

    ionViewWillLeave() {
        this.uxService.setTitleBarBackKeyShown(false);
        // TODO @chad titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_RIGHT, null);

        window.removeEventListener('native.keyboardshow', this.showHandle);
        window.removeEventListener('native.keyboardhide', this.hideHandle);
        this.loadingIdentity = false;
    }

    isWord(word): boolean {
      if(word) {
        return true
      } else {
        return false;
      }
    }

    getElements() {
        this.rootContent = document.getElementById('rootcontent')
        this.sentenceInput = document.getElementById('sentenceInput')
    }

    calcScrollHeight(keyboardHeight) {
        let scrollHeight = this.rootContent.clientHeight - this.sentenceInput.offsetTop - this.sentenceInput.clientHeight - keyboardHeight;
        return scrollHeight > 0 ? 0 : scrollHeight;
    }

    onMnemonicSentenceChanged() {
        this.mnemonicLanguage = this.getMnemonicLang();

        // Rebuild words based on typed sentence
        if (this.mnemonicLanguage === DIDPlugin.MnemonicLanguage.CHINESE_SIMPLIFIED) {
            this.getMnemonicWordsFromChinese();
        }
        else {
            this.mnemonicWords = this.mnemonicSentence.trim().split(" ");
            this.mnemonicWords = this.mnemonicWords.filter(item => item !== '');
        }
    }

    getMnemonicWordsFromChinese() {
        this.mnemonicWords = [];
        this.mnemonicSentence = this.mnemonicSentence.trim().replace(/ /g, '');
        for (let i = 0; i < this.mnemonicSentence.length; i++) {
            this.mnemonicWords.push(this.mnemonicSentence[i]);
        }
    }

    // Ask for mnemonic passphrase, if any
    async promptPassPhrase() {
        this.uxService.modal = await this.modalCtrl.create({
            component: MnemonicPassCheckComponent,
            componentProps: {
            },
            cssClass: this.theme.darkMode ? "create-password-modal-dark" : "create-password-modal"
        });
        this.uxService.modal.onDidDismiss().then((params) => {
            this.uxService.modal = null;
            if (params && params.data) {
                console.log("Import screen: import process is continuing");

                this.loadingIdentity = true;
                this.identityService.identityBeingCreated.mnemonicPassphrase = params.data.password;
                this.doImport();
            }
        });
        this.uxService.modal.present();
    }

    async promptStorePassword() {
        // First make sure that the provided mnemonic format is valid locally.
        this.mnemonicLanguage = this.getMnemonicLang();
        this.mnemonicForImport = this.mnemonicWords.join(' ').toLowerCase();;
        let mnemonicValid = await this.identityService.isMnemonicValid(this.mnemonicLanguage, this.mnemonicForImport);
        if (!mnemonicValid) {
            this.popup.ionicAlert('mnemonic-invalid', 'mnemonic-invalid-prompt');
            return;
        }

        this.promptPassPhrase();
    }

    private async doImport() {
        /* TODO @chad
        titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_LEFT, null);
        titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_RIGHT, null);
        titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.OUTER_RIGHT, null);
        */

        this.identityService.runNextStep(this.nextStepId, this.mnemonicForImport);
    }

    getMnemonicLang(): DIDPlugin.MnemonicLanguage {
        // TODO: Let user choose the right language on UI. For now, just using the system language,
        // this is a limitation.
        return this.identityService.getMnemonicLang();
    }

    inputMnemonicCompleted() {
      return this.mnemonicWords.length === 12;
    }

    onInputFocus() {
      this.zone.run(() => {
        this.hideButton = true;
      });
    }

    onInputBlur() {
      this.zone.run(() => {
        this.hideButton = false;
      });
    }
}
