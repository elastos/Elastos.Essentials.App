import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalNetworksService, MAINNET_TEMPLATE, TESTNET_TEMPLATE } from 'src/app/services/global.networks.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { CryptoNameResolver } from '../model/address-resolvers';
import { UnstoppableDomainsAddressResolver } from '../model/address-resolvers/resolvers/UnstoppableDomainsAddressResolver';
import { ArbitrumMainNetNetwork } from '../model/networks/arbitrum/arbitrum.mainnet.network';
import { BSCMainNetNetwork } from '../model/networks/bsc/bsc.mainnet.network';
import { BSCTestNetNetwork } from '../model/networks/bsc/bsc.testnet.network';
import { ElastosLRWNetwork } from '../model/networks/elastos/elastos.lrw.network';
import { ElastosMainNetNetwork } from '../model/networks/elastos/elastos.mainnet.network';
import { ElastosTestNetNetwork } from '../model/networks/elastos/elastos.testnet.network';
import { EthereumMainNetNetwork } from '../model/networks/ethereum/ethereum.mainnet.network';
import { EthereumRopstenNetwork } from '../model/networks/ethereum/ethereum.ropsten.network';
import { FusionMainNetNetwork } from '../model/networks/fusion/fusion.mainnet.network';
import { HECOMainNetNetwork } from '../model/networks/heco/heco.mainnet.network';
import { HECOTestNetNetwork } from '../model/networks/heco/heco.testnet.network';
import { Network } from '../model/networks/network';
import { PolygonMainNetNetwork } from '../model/networks/polygon/polygon.mainnet.network';
import { PolygonTestNetNetwork } from '../model/networks/polygon/polygon.testnet.network';
import { BridgeService } from './bridge.service';
import { ContactsService } from './contacts.service';
import { CurrencyService } from './currency.service';
import { CustomNetworkService } from './customnetwork.service';
import { EarnService } from './earn.service';
import { ETHTransactionService } from './ethtransaction.service';
import { IntentService } from './intent.service';
import { NameResolvingService } from './nameresolving.service';
import { NavService } from './nav.service';
import { WalletNetworkService } from './network.service';
import { WalletPrefsService } from './pref.service';
import { SwapService } from './swap.service';
import { UiService } from './ui.service';
import { WalletService } from './wallet.service';

@Injectable({
  providedIn: 'root'
})
export class WalletInitService extends GlobalService {
  private walletServiceInitialized = false;
  private waitForServiceInitialized = false;
  private subscription: Subscription = null;

  constructor(
    private intentService: IntentService,
    private walletManager: WalletService,
    private events: Events,
    private navService: NavService,
    private currencyService: CurrencyService,
    private contactsService: ContactsService,
    private prefs: WalletPrefsService,
    private uiService: UiService,
    private nameResolvingService: NameResolvingService,
    private networkService: WalletNetworkService,
    private customNetworkService: CustomNetworkService,
    private globalNetworksService: GlobalNetworksService,
    private ethTransactionService: ETHTransactionService,
    private earnService: EarnService, // IMPORTANT: unused, but keep it here for initialization
    private swapService: SwapService, // IMPORTANT: unused, but keep it here for initialization
    private bridgeService: BridgeService, // IMPORTANT: unused, but keep it here for initialization
    private httpClient: HttpClient
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

    // Networks init + registration
    await this.networkService.init();
    await this.customNetworkService.init();
    await this.registerNetworks();

    // Register name resolvers
    this.registerNameResolvers();

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

  private async registerNetworks(): Promise<void> {
    let networkTemplate = this.globalNetworksService.activeNetworkTemplate.value;
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        await this.createAndRegisterNetwork(new ElastosMainNetNetwork(), true);
        await this.createAndRegisterNetwork(new EthereumMainNetNetwork());
        await this.createAndRegisterNetwork(new HECOMainNetNetwork());
        await this.createAndRegisterNetwork(new BSCMainNetNetwork());
        await this.createAndRegisterNetwork(new FusionMainNetNetwork());
        await this.createAndRegisterNetwork(new ArbitrumMainNetNetwork());
        await this.createAndRegisterNetwork(new PolygonMainNetNetwork());
        return;
      case TESTNET_TEMPLATE:
        await this.createAndRegisterNetwork(new ElastosTestNetNetwork(), true);
        await this.createAndRegisterNetwork(new EthereumRopstenNetwork());
        await this.createAndRegisterNetwork(new HECOTestNetNetwork());
        await this.createAndRegisterNetwork(new BSCTestNetNetwork());
        // await this.createAndRegisterNetwork(new ArbitrumTestNetNetwork());
        await this.createAndRegisterNetwork(new PolygonTestNetNetwork());
        return;
      case "LRW":
        await this.createAndRegisterNetwork(new ElastosLRWNetwork(), true);
    }
  }

  private async createAndRegisterNetwork(network: Network, isDefault = false): Promise<void> {
    await network.init();
    await this.networkService.registerNetwork(network, isDefault);
  }

  private registerNameResolvers() {
    this.nameResolvingService.registernameResolver(new CryptoNameResolver(this.httpClient));
    this.nameResolvingService.registernameResolver(new UnstoppableDomainsAddressResolver(this.httpClient));
  }

  public async stop(): Promise<void> {
    Logger.log('wallet', 'init service stopping')
    await this.prefs.stop();
    this.currencyService.stop();
    await this.walletManager.stop();
    await this.intentService.stop();
    this.networkService.stop();
    this.nameResolvingService.reset();

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
