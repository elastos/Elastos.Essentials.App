import { Component, OnInit, ViewChild } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { Native } from '../../../services/native.service';
import { Util } from "../../../model/Util";
import { TranslateService } from '@ngx-translate/core';
import { WalletManager } from '../../../services/wallet.service';
import { WalletCreationService } from '../../../services/walletcreation.service';
import { Events } from '../../../services/events.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';

@Component({
  selector: 'app-wallet-advanced-import',
  templateUrl: './wallet-advanced-import.page.html',
  styleUrls: ['./wallet-advanced-import.page.scss'],
})
export class WalletAdvancedImportPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private masterWalletId = '1';
  public mnemonicSentence = '';
  public mnemonicWords = new Array<any>();

  constructor(
    private walletManager: WalletManager,
    private walletCreateService: WalletCreationService,
    private authService: AuthService,
    private native: Native,
    public translate: TranslateService,
    public events: Events,
  ) {
    this.masterWalletId = Util.uuid(6, 16);
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setBackgroundColor('#732cd0');
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
    this.titleBar.setTitle(' ');
  }

  onMnemonicSentenceChanged() {
    this.mnemonicWords = this.mnemonicSentence.trim().replace(/[\r\n]/g,"").split(" ");
    this.mnemonicWords = this.mnemonicWords.filter(item => item !== '');
  }

  inputMnemonicCompleted() {
    return this.mnemonicWords.length === 12;
  }

  async onImport() {
    if (this.inputMnemonicCompleted()) {
        Logger.log('wallet', 'Input string is valid');

        const payPassword = await this.authService.createAndSaveWalletPassword(this.masterWalletId);
        if (payPassword) {
            await this.native.showLoading(this.translate.instant('please-wait'));
            await this.importWalletWithMnemonic(payPassword);
        }
    } else {
        this.native.toast(this.translate.instant("mnemonic-import-missing-words"));
    }
  }

  async importWalletWithMnemonic(payPassword: string) {
    const mnemonicStr = this.mnemonicWords.join(' ').toLowerCase();
    await this.walletManager.importMasterWalletWithMnemonic(
        this.masterWalletId,
        this.walletCreateService.name,
        mnemonicStr,
        this.walletCreateService.mnemonicPassword,
        payPassword,
        this.walletCreateService.singleAddress
    );

    this.events.publish("masterwalletcount:changed", {
        action: 'add',
        walletId: this.masterWalletId
    });

    this.native.toast_trans('import-text-word-sucess');
  }

}
