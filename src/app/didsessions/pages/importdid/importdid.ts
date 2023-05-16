import { Component, ElementRef, NgZone, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonInput, ModalController, Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { MnemonicPassCheckComponent } from 'src/app/didsessions/components/mnemonicpasscheck/mnemonicpasscheck.component';
import { IdentityService } from 'src/app/didsessions/services/identity.service';
import { UXService } from 'src/app/didsessions/services/ux.service';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalMnemonicKeypadService } from 'src/app/services/global.mnemonickeypad.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { DIDMnemonicHelper } from '../../helpers/didmnemonic.helper';


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
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
  @ViewChild('addMnemonicWordInput', { static: false }) addMnemonicWordInput: IonInput;

  private nextStepId: number;
  public loadingIdentity = false;
  public mnemonicWords = new Array<string>()
  public mnemonicSentence = "";
  //   public mnemonicSentence: string = "income diesel latin coffee tourist kangaroo lumber great ill amazing say left"; // TMP TESTNET
  private mnemonicForImport = "";
  private mnemonicLanguage: DIDPlugin.MnemonicLanguage;
  public readonly = false; // set true if import mnemonic form wallet app

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public router: Router,
    public zone: NgZone,
    public platform: Platform,
    private modalCtrl: ModalController,
    private identityService: IdentityService,
    private uxService: UXService,
    private translate: TranslateService,
    private globalPopupService: GlobalPopupService,
    public theme: GlobalThemeService,
    private events: GlobalEvents,
    public element: ElementRef,
    private mnemonicKeypadService: GlobalMnemonicKeypadService
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (!Util.isEmptyObject(navigation.extras.state)) {
      this.nextStepId = navigation.extras.state.enterEvent.stepId;
      //Logger.log('didsessions', 'Importdid - nextStepId', this.nextStepId);
      if (!Util.isEmptyObject(navigation.extras.state.mnemonic)) {
        this.mnemonicSentence = navigation.extras.state.mnemonic;
        this.onMnemonicSentenceChanged();
        this.readonly = true;
      }
    }
  }

  ngOnInit() {
    this.events.subscribe('qrScanner', (qrData) => {
      this.mnemonicSentence = qrData.mnemonic;
      this.onMnemonicSentenceChanged();
    })
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('didsessions.import-my-did'));
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: 'back', iconPath: BuiltInIcon.BACK });
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: "language", iconPath: BuiltInIcon.EDIT });
    this.titleBar.setIcon(TitleBarIconSlot.INNER_RIGHT, { key: "scan", iconPath: BuiltInIcon.SCAN });
    this.titleBar.setNavigationMode(null);
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      this.uxService.onTitleBarItemClicked(icon);
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    this.loadingIdentity = false;

    void this.mnemonicKeypadService.dismissMnemonicPrompt();
  }

  isWord(word): boolean {
    if (word) {
      return true
    } else {
      return false;
    }
  }

  onMnemonicSentenceChanged() {
    let standardMnemonicSentence = this.mnemonicSentence.trim().replace(/[\r\n]/g, "");
    let chineseMnemonic = Util.chinese(this.mnemonicSentence[0]);
    if (chineseMnemonic) {
      // Chinese mnemonics are entered without spaces.
      this.mnemonicWords = [];
      standardMnemonicSentence = standardMnemonicSentence.replace(/ /g, '');
      for (let i = 0; i < standardMnemonicSentence.length; i++) {
        this.mnemonicWords.push(standardMnemonicSentence[i]);
      }
    } else {
      this.mnemonicWords = standardMnemonicSentence.split(" ").filter(item => item !== '');
    }
  }

  // Ask for mnemonic passphrase, if any
  async promptPassPhrase() {
    this.uxService.modal = await this.modalCtrl.create({
      component: MnemonicPassCheckComponent,
      componentProps: {
      },
      cssClass: !this.theme.darkMode ? 'didsessions-mnemonicpasscheck-component' : 'didsessions-mnemonicpasscheck-component-dark',
    });
    this.uxService.modal.onDidDismiss().then((params) => {
      this.uxService.modal = null;
      if (params && params.data) {
        Logger.log('didsessions', "Import screen: import process is continuing");

        this.loadingIdentity = true;
        this.identityService.identityBeingCreated.mnemonicLanguage = this.mnemonicLanguage;
        this.identityService.identityBeingCreated.mnemonicPassphrase = params.data.password;
        void this.doImport();
      }
    });
    await this.uxService.modal.present();
  }

  async promptStorePassword() {
    this.mnemonicForImport = this.mnemonicWords.join(' ').toLowerCase();
    this.mnemonicLanguage = await DIDMnemonicHelper.getMnemonicLanguage(this.mnemonicForImport);
    if (!this.mnemonicLanguage) {
      void this.globalPopupService.ionicAlert('didsessions.mnemonic-invalid', 'didsessions.mnemonic-invalid-prompt');
      return;
    }

    await this.promptPassPhrase();
  }

  private async doImport() {
    await this.identityService.runNextStep(this.nextStepId, this.mnemonicForImport);
    this.loadingIdentity = false;
  }

  inputMnemonicCompleted() {
    return this.mnemonicWords.length === 12;
  }

  public async startMnemonicInput() {
    await this.mnemonicKeypadService.promptMnemonic(12, this.mnemonicWords, words => {
      // Update words in the input box when received from the mnemonic keypad
      this.mnemonicSentence = words.join(" ");
      this.onMnemonicSentenceChanged();
    }, pasted => {
      this.mnemonicSentence = pasted;
      this.onMnemonicSentenceChanged();
    });
  }
}
