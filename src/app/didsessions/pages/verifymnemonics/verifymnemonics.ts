import { Component, NgZone, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';

import { Util } from '../../services/util';
import { TranslateService } from '@ngx-translate/core';
import { AlertController, NavController } from '@ionic/angular';
import { UXService } from 'src/app/didsessions/services/ux.service';
import { IdentityService } from 'src/app/didsessions/services/identity.service';
import { ThemeService } from 'src/app/services/theme.service';

type MnemonicWord = {
    text: string;
    selected: boolean;
}

@Component({
    selector: 'page-verifymnemonics',
    templateUrl: 'verifymnemonics.html',
    styleUrls: ['verifymnemonics.scss']
})
export class VerifyMnemonicsPage {

    mnemonicList: Array<MnemonicWord> = [];
    selectedList = [];
    mnemonicStr: string;
    allWordsSelected: boolean = false;

    constructor(
      public router: Router,
      public zone: NgZone,
      private identityService: IdentityService,
      private uxService: UXService,
      public theme: ThemeService,
      private translate: TranslateService,
      private alertCtrl: AlertController,
      private navCtrl: NavController
    ) {
      this.init();
    }

    ionViewWillEnter() {
      // TODO @chad titleBarManager.setTitle(this.translate.instant('verify-mnemonic'));
      this.uxService.setTitleBarBackKeyShown(true);
    }

    init() {
        this.createEmptySelectedList();
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            this.mnemonicStr = Util.clone(navigation.extras.state["mnemonicStr"]);
            this.mnemonicList = this.mnemonicStr.split(" ").map((word)=>{
                return {text: word, selected: false}
            });
            this.mnemonicList = this.mnemonicList.sort(function () { return 0.5 - Math.random() });
        }
    }

    createEmptySelectedList() {
      this.selectedList = [];
      for(let i = 0; i < 12; i++) {
        this.selectedList.push(i);
      }
    }

    isWord(word): boolean {
      if(isNaN(word)) {
        return true
      } else {
        return false;
      }
    }

    removeWord(word: any, index: number) {
      console.log(word);
      if(isNaN(word)) {
        this.mnemonicList.map((mnemonic) => {
          if(mnemonic.text === word) {
            mnemonic.selected = false;
          }
        });

        this.selectedList[index] = index;
        console.log(this.selectedList);
      } else {
        return;
      }

      this.addButton();
    }

    public addWord(index: number, item: MnemonicWord): void {
      let nextItem = this.selectedList.find((word) => Number.isInteger(word));
      this.selectedList[nextItem] = item.text;
      this.mnemonicList[index].selected = true;

      this.addButton();
    }

    public addButton() {
      let word = this.mnemonicList.find((mnemonic) => mnemonic.selected !== true);
      if(!word) {
        this.allWordsSelected = true;
      } else {
        this.allWordsSelected = false;
      }
    }

    /*public removeButton(index: number, item: any): void {
        this.zone.run(() => {
            this.selectedList.splice(index, 1);
            this.mnemonicList[item.prevIndex].selected = false;
        });
    }*/

    nextClicked() {
      if(this.allWordsMatch()) {
        this.createDid();
      } else {
        this.returnToBackup();
      }
    }

    async returnToBackup() {
      const alert = await this.alertCtrl.create({
        header: this.translate.instant('mnemonics-incorrect'),
        mode: 'ios',
        message: this.translate.instant('check-mnemonics'),
        buttons: [
          {
            text: this.translate.instant('Okay'),
            handler: () => {
              this.navCtrl.back();
            }
          }
        ]
      });

      await alert.present();
    }

    async createDid() {
      await this.identityService.createNewDIDWithNewMnemonic();
    }

    allWordsMatch() {
        //  return true; // for test

        let selectComplete = this.selectedList.length === this.mnemonicList.length ? true : false;
        if (selectComplete) {
            let mn = "";
            for (let i = 0; i < this.selectedList.length; i++) {
                mn += this.selectedList[i];
            }
            if (!Util.isNull(mn) && mn == this.mnemonicStr.replace(/\s+/g, "")) {
                return true;
            }
        }
        return false;
    }
}
