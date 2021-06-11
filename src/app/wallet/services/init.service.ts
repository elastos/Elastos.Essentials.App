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
import { GlobalService } from 'src/app/services/global.service.manager';
import { AuthService } from './auth.service';
import { Util } from 'src/app/didsessions/services/util';

@Injectable({
  providedIn: 'root'
})
export class WalletInitService extends GlobalService {
  private walletServiceInitialized = false;
  private waitForServiceInitialized = false;
  private subscription: Subscription = null;

  constructor(
    private intentService: IntentService,
    public localStorage: LocalStorage,
    public walletManager: WalletManager,
    public events: Events,
    public zone: NgZone,
    public translate: TranslateService,
    private navService: NavService,
    private currencyService: CurrencyService,
    public popupProvider: PopupProvider,
    public modalCtrl: ModalController,
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

    // TODO: Need to improve.
    //After created or imported did, automatically import the did for the wallet.
    // if (signedInIdentity.mnemonicInfo != null) {
    //   await this.importWalletWithMnemonicInfo(signedInIdentity.mnemonicInfo);
    //   signedInIdentity.mnemonicInfo = null;
    // }
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
      if (!this.waitForServiceInitialized) {
        this.waitForServiceInitialized = true;
        // Wait until the wallet manager is ready before showing the first screen.
        let subscription = this.events.subscribe("walletmanager:initialized", () => {
          Logger.log("wallet", "walletmanager:initialized event received, showStartupScreen");
          this.navService.showStartupScreen();
          this.waitForServiceInitialized = false;
          subscription.unsubscribe();
        });
      } else {
        Logger.log("wallet", "Wallet service is initializing, The Wallet will be displayed when the service is initialized.");
      }
    }
  }
}
