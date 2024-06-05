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
import { IntentService, ScanType } from 'src/app/wallet/services/intent.service';
import { AuthService } from '../../../services/auth.service';
import { Native } from '../../../services/native.service';
import { WalletService } from '../../../services/wallet.service';
import { WalletCreationService } from '../../../services/walletcreation.service';
import { SPVService } from 'src/app/wallet/services/spv.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalNetworksService } from 'src/app/services/global.networks.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';

@Component({
  selector: 'app-wallet-import-keystore-spv',
  templateUrl: './wallet-import-keystore-spv.page.html',
  styleUrls: ['./wallet-import-keystore-spv.page.scss'],
})
export class WalletImportByKeystoreSpvPage implements OnInit, OnDestroy {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private masterWalletId = '1';
  public privatekey = '';
  public contentIsJsonObj = false;
  public keystoreBackupPassword = '';

  public filePath = '';
  public mnemonic = ''
  public seed = ''
  public walletBasicInfo = ''
  public address = ''

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
    public globalPopupService: GlobalPopupService,
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
    // this.titleBar.setTitle(this.translate.instant('wallet.import-wallet'));
    this.titleBar.setTitle("Parse Keystore");
    // this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: "scan", iconPath: BuiltInIcon.SCAN });
    // this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
    //   this.goScan();
    // });
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
    }

    return false;
  }

  async onImport() {
    if (!this.contentIsJsonObj) {
      this.native.toast_trans('keystore is wrong');
      return;
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
          this.native.toast_trans('Invalid keystore');
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


  async importWalletWithKeyStore(payPassword: string) {
    let spvService = new SPVService(this.native, this.events, this.globalPopupService);
    // We need to configure ethsc to obtain the private key.
    let spvnetworkconfig = {'ELA':{}, 'ETHSC': {ChainID: 20, NetworkID: 20 }}

    let spvNetworkTemplate = GlobalNetworksService.instance.getActiveNetworkTemplate()
    await spvService.setNetwork(spvNetworkTemplate, JSON.stringify(spvnetworkconfig));

    let identityEntry = GlobalDIDSessionsService.instance.getSignedInIdentity()
    let rootPath = identityEntry.didStoragePath;
    this.filePath = rootPath + '/spv/data/' + this.masterWalletId + '/LocalStore.json';

    await spvService.init(rootPath);

    let wallets = await spvService.getAllMasterWallets()
    for (let i = 0; i < wallets.length; i++) {
      await spvService.destroyWallet(wallets[i])
    }

    let basicInfo = await spvService.importWalletWithKeystore(this.masterWalletId, this.privatekey, this.keystoreBackupPassword, payPassword)

    this.walletBasicInfo = JSON.stringify(basicInfo, null, 2)

    this.mnemonic = await spvService.exportWalletWithMnemonic(this.masterWalletId, payPassword)

    this.seed = await spvService.exportWalletWithSeed(this.masterWalletId, payPassword)

    let ret = await spvService.createSubWallet(this.masterWalletId, "ELA")

    this.address = await spvService.createAddress(this.masterWalletId, "ELA")

    this.native.toast_trans('common.done');
  }

  async pasteFromClipboard() {
    this.privatekey = await this.native.pasteFromClipboard();
    this.getContentType();
    this.adjustTextareaHeight();
  }

  copyAddress() {
    void this.native.copyClipboard(this.address);
    this.native.toast(this.translate.instant("common.copied-to-clipboard"));
  }

  copyMnemonic() {
    void this.native.copyClipboard(this.mnemonic);
    this.native.toast(this.translate.instant("common.copied-to-clipboard"));
  }

  copySeed() {
    void this.native.copyClipboard(this.seed);
    this.native.toast(this.translate.instant("common.copied-to-clipboard"));
  }

  copyPath() {
    void this.native.copyClipboard(this.filePath);
    this.native.toast(this.translate.instant("common.copied-to-clipboard"));
  }

  copyBasicInfo() {
    void this.native.copyClipboard(this.walletBasicInfo);
    this.native.toast(this.translate.instant("common.copied-to-clipboard"));
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
