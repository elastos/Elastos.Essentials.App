import { Component, NgZone, ViewChild } from '@angular/core';
import { Router } from '@angular/router';

import { Util } from '../../services/util';
import { TranslateService } from '@ngx-translate/core';
import { AlertController } from '@ionic/angular';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot, BuiltInIcon, TitleBarIcon, TitleBarMenuItem, TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';

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
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
    mnemonicList: Array<MnemonicWord> = [];
    selectedList = [];
    mnemonicStr: string;
    allWordsSelected = false;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
      public router: Router,
      public zone: NgZone,
      public theme: GlobalThemeService,
      private translate: TranslateService,
      private alertCtrl: AlertController,
      private globalNav: GlobalNavService,
      private native: GlobalNativeService,
      private didSessions: GlobalDIDSessionsService
    ) {
      this.init();
    }

    ionViewWillEnter() {
      this.titleBar.setTitle(this.translate.instant('didsessions.verify-mnemonic'));
      this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key:'back', iconPath: BuiltInIcon.BACK });
      this.titleBar.setNavigationMode(null);
      this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
        void this.globalNav.navigateBack();
      });
    }

    ionViewWillLeave() {
      this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    init() {
        this.createEmptySelectedList();
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            this.mnemonicStr = navigation.extras.state["mnemonicStr"];
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
      if(isNaN(word)) {
        this.mnemonicList.map((mnemonic) => {
          if(mnemonic.text === word) {
            mnemonic.selected = false;
          }
        });

        this.selectedList[index] = index;
      } else {
        return;
      }

      this.toggleButton();
    }

    public addWord(index: number, item: MnemonicWord): void {
      let nextItem = this.selectedList.find((word) => Number.isInteger(word));
      this.selectedList[nextItem] = item.text;
      this.mnemonicList[index].selected = true;

      this.toggleButton();
    }

    public toggleButton() {
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
        void this.continueAfterSuccessfulVerification();
      } else {
        void this.returnToBackup();
      }
    }

    private async continueAfterSuccessfulVerification() {
      this.native.genericToast('identity.backup-success');
      await this.didSessions.markActiveIdentityBackedUp();
      void this.globalNav.navigateHome();
    }

    async returnToBackup() {
      const alert = await this.alertCtrl.create({
        header: this.translate.instant('didsessions.mnemonics-incorrect'),
        mode: 'ios',
        message: this.translate.instant('didsessions.check-mnemonics'),
        buttons: [
          {
            text: this.translate.instant('common.ok'),
            handler: () => {
              void this.globalNav.navigateBack();
            }
          }
        ]
      });

      await alert.present();
    }

    allWordsMatch() {
        // return true; // for test

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
