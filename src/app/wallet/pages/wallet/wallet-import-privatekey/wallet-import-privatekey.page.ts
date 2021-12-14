import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { Events } from 'src/app/services/events.service';
import { AuthService } from '../../../services/auth.service';
import { Native } from '../../../services/native.service';
import { WalletService } from '../../../services/wallet.service';
import { WalletCreationService } from '../../../services/walletcreation.service';

@Component({
  selector: 'app-wallet-import-privatekey',
  templateUrl: './wallet-import-privatekey.page.html',
  styleUrls: ['./wallet-import-privatekey.page.scss'],
})
export class WalletImportByPrivateKeyPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private masterWalletId = '1';
  public privatekey = '';

  constructor(
    private walletManager: WalletService,
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
    this.titleBar.setTitle(this.translate.instant('wallet.import-wallet'));
  }

  inputPrivatKeyCompleted() {
    return this.privatekey.length > 1;
  }

  async onImport() {
    if (this.inputPrivatKeyCompleted()) {

        const payPassword = await this.authService.createAndSaveWalletPassword(this.masterWalletId);
        if (payPassword) {
          try {
            await this.native.showLoading(this.translate.instant('common.please-wait'));
            await this.importWalletWithPrivateKey(payPassword);
            await this.native.hideLoading();
          } catch (err) {
            Logger.error('wallet', 'Wallet import error:', err);
            await this.native.hideLoading();
          }
        }
    } else {
        this.native.toast(this.translate.instant("wallet.mnemonic-import-missing-words"));
    }
  }

  async importWalletWithPrivateKey(payPassword: string) {
    if (this.privatekey.startsWith('0x')) {
        this.privatekey = this.privatekey.substring(2);
    }
    await this.walletManager.importWalletWithPrivateKey(
        this.masterWalletId,
        this.walletCreateService.name,
        this.privatekey,
        payPassword,
    );

    this.events.publish("masterwalletcount:changed", {
        action: 'add',
        walletId: this.masterWalletId
    });

    this.native.toast_trans('wallet.import-private-key-sucess');
  }

  async pasteFromClipboard() {
    this.privatekey = await this.native.pasteFromClipboard();
  }

}
