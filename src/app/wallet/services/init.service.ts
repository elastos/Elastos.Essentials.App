import { Injectable, NgZone } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { PopupProvider } from './popup.service';
import { UiService } from './ui.service';
import { Events } from './events.service';
import { CoinService } from './coin.service';
import { ContactsService } from './contacts.service';
import { CurrencyService } from './currency.service';
import { IntentService } from './intent.service';
import { NavService } from './nav.service';
import { WalletManager } from './wallet.service';
import { LocalStorage } from './storage.service';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { WalletPrefsService } from './pref.service';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WalletInitService {
  private walletServiceInitialized = false;
  private waitforServiceInitialized = false;
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
    private didSessions: GlobalDIDSessionsService
  ) {}

  public async init(): Promise<void> {
    this.didSessions.signedInIdentityListener.subscribe(async (signedInIdentity)=>{
      if (signedInIdentity) {
        Logger.log("Wallet", "Wallet service is initializing");

        await this.prefs.init();
        await this.coinService.init();
        await this.currencyService.init();
        await this.contactsService.init();
        await this.uiService.init();

        // Wait until the wallet manager is ready before showing the first screen.
        // TODO: rework
        this.subscription = this.events.subscribe("walletmanager:initialized", () => {
            Logger.log("wallet", "walletmanager:initialized event received");
            this.walletServiceInitialized = true;
        });

        await this.walletManager.init();
        await this.intentService.init();
      }
    });
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
}
