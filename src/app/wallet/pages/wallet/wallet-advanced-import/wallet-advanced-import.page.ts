import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { WalletExceptionHelper } from 'src/app/helpers/wallet.helper';
import { Logger } from 'src/app/logger';
import { WalletAlreadyExistException } from 'src/app/model/exceptions/walletalreadyexist.exception';
import { Util } from 'src/app/model/util';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { ElastosMainChainWalletNetworkOptions, WalletCreator } from 'src/app/wallet/model/masterwallets/wallet.types';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { LocalStorage } from 'src/app/wallet/services/storage.service';
import { AuthService } from '../../../services/auth.service';
import { Native } from '../../../services/native.service';
import { WalletService } from '../../../services/wallet.service';
import { WalletCreationService } from '../../../services/walletcreation.service';

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
    public localStorage: LocalStorage,
    private walletService: WalletService,
    private walletCreationService: WalletCreationService,
    private authService: AuthService,
    private native: Native,
    public translate: TranslateService,
    public events: GlobalEvents,
  ) {
    this.masterWalletId = walletService.createMasterWalletID();
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setBackgroundColor('#732cd0');
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
    this.titleBar.setTitle(this.translate.instant('wallet.import-wallet'));
  }

  onMnemonicSentenceChanged() {
    let standardMnemonicSentence = this.mnemonicSentence.trim().replace(/[\r\n]/g, "");
    let chineseMnemonic = Util.chinese(this.mnemonicSentence[0]);
    if (chineseMnemonic) {
      // You can input chinese mnemonics without space.
      this.mnemonicWords = [];
      standardMnemonicSentence = standardMnemonicSentence.replace(/ /g, '');
      for (let i = 0; i < standardMnemonicSentence.length; i++) {
        this.mnemonicWords.push(standardMnemonicSentence[i]);
      }
    } else {
      this.mnemonicWords = standardMnemonicSentence.split(" ").filter(item => item !== '');
    }
  }

  inputMnemonicCompleted() {
    return this.mnemonicWords.length === 12;
  }

  async onImport() {
    if (this.inputMnemonicCompleted()) {
      Logger.log('wallet', 'Input string is valid');

      const payPassword = await this.authService.createAndSaveWalletPassword(this.masterWalletId);
      if (payPassword) {
        try {
          await this.native.showLoading(this.translate.instant('common.please-wait'));
          await this.importWalletWithMnemonic(payPassword);
          await this.native.hideLoading();
        } catch (err) {
          Logger.error('wallet', 'Wallet import error:', err);
          await this.native.hideLoading();
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
      }
    } else {
      this.native.toast(this.translate.instant("wallet.mnemonic-import-missing-words"));
    }
  }

  async importWalletWithMnemonic(payPassword: string) {
    let elastosNetworkOptions: ElastosMainChainWalletNetworkOptions = {
      network: "elastos", // mainchain
      singleAddress: this.walletCreationService.singleAddress
    };

    const mnemonicStr = this.mnemonicWords.join(' ').toLowerCase();
    await this.walletService.newStandardWalletWithMnemonic(
      this.masterWalletId,
      this.walletCreationService.name,
      mnemonicStr,
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

}
