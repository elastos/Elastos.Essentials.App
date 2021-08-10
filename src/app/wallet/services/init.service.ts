import { Injectable } from '@angular/core';
import { UiService } from './ui.service';
import { CoinService } from './coin.service';
import { ContactsService } from './contacts.service';
import { CurrencyService } from './currency.service';
import { IntentService } from './intent.service';
import { NavService } from './nav.service';
import { WalletManager } from './wallet.service';
import { Logger } from 'src/app/logger';
import { IdentityEntry } from 'src/app/services/global.didsessions.service';
import { WalletPrefsService } from './pref.service';
import { Subscription } from 'rxjs';
import { Events } from 'src/app/services/events.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { ETHTransactionService } from './ethtransaction.service';

@Injectable({
  providedIn: 'root'
})
export class WalletInitService extends GlobalService {
  private walletServiceInitialized = false;
  private waitForServiceInitialized = false;
  private subscription: Subscription = null;

  constructor(
    private intentService: IntentService,
    private walletManager: WalletManager,
    private events: Events,
    private navService: NavService,
    private currencyService: CurrencyService,
    private coinService: CoinService,
    private contactsService: ContactsService,
    private prefs: WalletPrefsService,
    private uiService: UiService,
    private ethTransactionService: ETHTransactionService
  ) {
    super();
  }

  public init(): Promise<void> {
    GlobalServiceManager.getInstance().registerService(this);
    return;
  }

  public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    Logger.log("Wallet", "Wallet service is initializing");

    await this.prefs.init();
    await this.coinService.init();
    // Do not await.
    void this.currencyService.init();
    // Do not await.
    void this.contactsService.init();
    void this.ethTransactionService.init();
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
