import { Injectable, NgZone } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { ImageLoaderConfigService } from 'ionic-image-loader';
import { PopupProvider } from './popup.service';
import { AppService } from './app.service';
import { UiService } from './ui.service';
import { Events } from './events.service';
import { CoinService } from './coin.service';
import { ContactsService } from './contacts.service';
import { CurrencyService } from './currency.service';
import { ERC20CoinService } from './erc20coin.service';
import { IntentService } from './intent.service';
import { NavService } from './nav.service';
import { WalletManager } from './wallet.service';
import { LocalStorage } from './storage.service';
import { Logger } from 'src/app/logger';

@Injectable({
  providedIn: 'root'
})
export class WalletInitService {
  constructor(
    private intentService: IntentService,
    public localStorage: LocalStorage,
    public walletManager: WalletManager,
    public events: Events,
    public zone: NgZone,
    public translate: TranslateService,
    private navService: NavService,
    public appService: AppService,
    private currencyService: CurrencyService,
    public popupProvider: PopupProvider,
    public modalCtrl: ModalController,
    private coinService: CoinService,
    private contactsService: ContactsService,
    private erc20CoinService: ERC20CoinService,
    private uiService: UiService,
    private imageLoaderConfig: ImageLoaderConfigService
  ) {}

  public async init(): Promise<void> {
    Logger.log("Wallet", "Wallet service is initializing");
    this.imageLoaderConfig.useImageTag(true);

    await this.appService.init();
    await this.coinService.init();
    await this.currencyService.init();
    await this.contactsService.init();
    await this.uiService.init();
    await this.erc20CoinService.init();

    // Wait until the wallet manager is ready before showing the first screen.
    // TODO: rework
    this.events.subscribe("walletmanager:initialized", () => {
        console.log("walletmanager:initialized event received");
    });

    await this.walletManager.init();
    await this.intentService.init();
  }

  public start() {
    this.navService.showStartupScreen();
  }
}
