import { Injectable, NgZone } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { PopupProvider } from './popup.service';
import { UiService } from './ui.service';
import { CoinService } from './coin.service';
import { ContactsService } from './contacts.service';
import { CurrencyService } from './currency.service';
import { IntentService } from './intent.service';
import { NavService } from './nav.service';
import { WalletManager } from './wallet.service';
import { LocalStorage } from './storage.service';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { WalletPrefsService } from './pref.service';
import { Subscription } from 'rxjs';
import { Events } from 'src/app/services/events.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { AuthService } from './auth.service';
import { Util } from 'src/app/didsessions/services/util';
import { NewIdentity } from 'src/app/didsessions/model/newidentity';

@Injectable({
  providedIn: 'root'
})
export class WalletInitService extends GlobalService {
  private walletServiceInitialized = false;
  private waitforServiceInitialized = false;
  private subscription: Subscription = null;

  constructor(
    private intentService: IntentService,
    private localStorage: LocalStorage,
    private walletManager: WalletManager,
    private events: Events,
    private zone: NgZone,
    private translate: TranslateService,
    private navService: NavService,
    private currencyService: CurrencyService,
    private popupProvider: PopupProvider,
    private modalCtrl: ModalController,
    private coinService: CoinService,
    private contactsService: ContactsService,
    private prefs: WalletPrefsService,
    private uiService: UiService,
    private authService: AuthService,
    private didSessions: GlobalDIDSessionsService
  ) {
    super();
  }

  public async init(): Promise<void> {
    GlobalServiceManager.getInstance().registerService(this);
  }

  public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    Logger.log("Wallet", "Wallet service is initializing");

    await this.prefs.init();
    await this.coinService.init();
    await this.currencyService.init();
    await this.contactsService.init();
    await this.uiService.init();

    // TODO: dirty, rework this
    this.subscription = this.events.subscribe("walletmanager:initialized", () => {
      Logger.log("wallet", "walletmanager:initialized event received");
      this.walletServiceInitialized = true;
    });

    await this.walletManager.init();
    await this.intentService.init();
  }

  public async onUserSignOut(): Promise<void> {
    await this.stop();
  }

  public async stop(): Promise<void> {
    Logger.log('wallet', 'init service stopping')
    await this.prefs.stop();
    this.currencyService.stop();
    await this.walletManager.stop();
    await this.intentService.stop();

    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    this.walletServiceInitialized = true;
    Logger.log('wallet', 'init service stopped')
  }

  public start() {
    if (this.walletServiceInitialized) {
      this.navService.showStartupScreen();
    } else {
      if (!this.waitforServiceInitialized) {
        this.waitforServiceInitialized = true;
        // Wait until the wallet manager is ready before showing the first screen.
        let subscription = this.events.subscribe("walletmanager:initialized", () => {
          Logger.log("wallet", "walletmanager:initialized event received, showStartupScreen");
          this.navService.showStartupScreen();
          this.waitforServiceInitialized = false;
          subscription.unsubscribe();
        });
      } else {
        Logger.log("wallet", "Wallet service is initializing, The Wallet will be displayed when the service is initialized.");
      }
    }
  }

  public async importWalletWithMnemonicInfo(mnemonicInfo: NewIdentity): Promise<void> {
    Logger.error("wallet", "importWallet");
    let masterWalletId = Util.uuid(6, 16);
    const payPassword = await this.authService.createAndSaveWalletPassword(masterWalletId);
    if (payPassword) {
      try {
        await this.walletManager.importWalletWithMnemonic(
          masterWalletId,
          mnemonicInfo.name,
          mnemonicInfo.mnemonic,
          mnemonicInfo.mnemonicPassphrase || "",
          payPassword,
          false
        );
      }
      catch (err) {
        Logger.error('wallet', 'Wallet import error:', err);
      }
    }
  }
}
