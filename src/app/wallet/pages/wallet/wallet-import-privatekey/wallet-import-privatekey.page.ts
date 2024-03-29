import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { WalletExceptionHelper } from 'src/app/helpers/wallet.helper';
import { Logger } from 'src/app/logger';
import { BiometricAuthenticationFailedException } from 'src/app/model/exceptions/biometricauthenticationfailed.exception';
import { BiometricLockedoutException } from 'src/app/model/exceptions/biometriclockedout.exception';
import { PasswordManagerCancellationException } from 'src/app/model/exceptions/passwordmanagercancellationexception';
import { WrongPasswordException } from 'src/app/model/exceptions/wrongpasswordexception.exception';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { Config } from 'src/app/wallet/config/Config';
import { PrivateKeyType } from 'src/app/wallet/model/masterwallets/wallet.types';
import { IntentService, ScanType } from 'src/app/wallet/services/intent.service';
import { AuthService } from '../../../services/auth.service';
import { Native } from '../../../services/native.service';
import { WalletService } from '../../../services/wallet.service';
import { WalletCreationService } from '../../../services/walletcreation.service';

@Component({
  selector: 'app-wallet-import-privatekey',
  templateUrl: './wallet-import-privatekey.page.html',
  styleUrls: ['./wallet-import-privatekey.page.scss'],
})
export class WalletImportByPrivateKeyPage implements OnInit, OnDestroy {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private masterWalletId = '1';
  public privatekey = '';
  public contentIsJsonObj = false;
  public keystoreBackupPassword = '';

  private privatekeyUpdateSubscription: Subscription = null;
  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    private walletManager: WalletService,
    private walletCreateService: WalletCreationService,
    private authService: AuthService,
    private native: Native,
    public translate: TranslateService,
    public events: GlobalEvents,
    public zone: NgZone,
    private intentService: IntentService,
    public element: ElementRef
  ) {
    this.masterWalletId = this.walletManager.createMasterWalletID();
  }

  ngOnInit() {
    this.privatekeyUpdateSubscription = this.events.subscribe('privatekey:update', (privatekey) => {
      this.zone.run(() => {
        this.privatekey = privatekey;
        this.getContentType();
        this.adjustTextareaHeight();
      });
    });
  }

  ngOnDestroy() {
    if (this.privatekeyUpdateSubscription) this.privatekeyUpdateSubscription.unsubscribe();
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('wallet.import-wallet'));
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: "scan", iconPath: BuiltInIcon.SCAN });
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      this.goScan();
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  // TODO: Find a better way to Fix the height of the textarea.
  private adjustTextareaHeight() {
    setTimeout(() => {
      // textarea: the element in the ion-textarea.
      let textarea = this.element.nativeElement.querySelector("textarea");
      if (textarea) {
        textarea.style.height = '120px';
      }
    }, 100);
  }

  inputPrivatKeyCompleted() {
    if (this.contentIsJsonObj) {
      return this.keystoreBackupPassword.length >= Config.MIN_PASSWORD_LENGTH;
    } else {
      return this.privatekey.length > 1;
    }
  }

  async onImport() {
    if (!this.contentIsJsonObj) {
      if (this.privatekey.startsWith('0x')) {
        this.privatekey = this.privatekey.substring(2);
      }
      const isPrivate = (await import('tiny-secp256k1')).isPrivate;
      if (!isPrivate(Buffer.from(this.privatekey, 'hex'))) {
        this.native.toast_trans('wallet.wrong-privatekey-msg');
        return;
      }
    }

    let payPassword = null;
    try {
        payPassword = await this.authService.createAndSaveWalletPassword(this.masterWalletId);
    } catch(e) {
        let reworkedEx = WalletExceptionHelper.reworkedPasswordException(e);
        if (reworkedEx instanceof PasswordManagerCancellationException || reworkedEx instanceof WrongPasswordException
            || reworkedEx instanceof BiometricAuthenticationFailedException || reworkedEx instanceof BiometricLockedoutException) {
            // Nothing to do, just stop the flow here.
        }
        else {
            throw e;
        }
    }

    if (payPassword) {
      try {
        await this.native.showLoading(this.translate.instant('common.please-wait'));
        if (this.contentIsJsonObj) {
          await this.importWalletWithKeyStore(payPassword);
        } else {
          await this.importWalletWithPrivateKey(payPassword);
        }
      } catch (err) {
        Logger.error('wallet', 'Wallet importWalletWithPrivateKey error:', err);
        await this.walletManager.destroyMasterWallet(this.masterWalletId, false);
        await this.authService.deleteWalletPassword(this.masterWalletId);
        this.native.toast_trans(err.message || err);
      }
      finally {
        await this.native.hideLoading();
      }
    }
  }

  async importWalletWithPrivateKey(payPassword: string) {
    await this.walletManager.newStandardWalletWithPrivateKey(
      this.masterWalletId,
      this.walletCreateService.name,
      this.privatekey,
      PrivateKeyType.EVM, // TODO: Support other private key formats later
      payPassword,
    );

    // Go to wallet's home page.
    this.native.setRootRouter("/wallet/wallet-home");

    this.events.publish("masterwalletcount:changed", {
      action: 'add',
      walletId: this.masterWalletId
    });

    this.native.toast_trans('wallet.import-private-key-sucess');
  }

  async importWalletWithKeyStore(payPassword: string) {
    /* await this.walletManager.importWalletWithKeystore(
      this.masterWalletId,
      this.walletCreateService.name,
      this.privatekey,
      this.keystoreBackupPassword,
      payPassword,
    );

    this.events.publish("masterwalletcount:changed", {
      action: 'add',
      walletId: this.masterWalletId
    });

    this.native.toast_trans('wallet.import-keystore-sucess'); */
  }

  async pasteFromClipboard() {
    this.privatekey = await this.native.pasteFromClipboard();
    this.getContentType();
    this.adjustTextareaHeight();
  }

  getContentType() {
    try {
      JSON.parse(this.privatekey);
      this.contentIsJsonObj = true;
    }
    catch (err) {
      this.contentIsJsonObj = false;
    }
  }

  goScan() {
    void this.intentService.scan(ScanType.PrivateKey);
  }

}
