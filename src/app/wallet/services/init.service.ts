import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalNetworksService, MAINNET_TEMPLATE, TESTNET_TEMPLATE } from 'src/app/services/global.networks.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { CryptoNameResolver } from '../model/address-resolvers';
import { IdrissResolver } from '../model/address-resolvers/resolvers/IdrissAddressResolver';
import { UnstoppableDomainsAddressResolver } from '../model/address-resolvers/resolvers/UnstoppableDomainsAddressResolver';
import { ArbitrumMainNetNetwork } from '../model/networks/arbitrum/arbitrum.mainnet.network';
import { AvalancheCChainMainNetNetwork } from '../model/networks/avalanchecchain/avalanchecchain.mainnet.network';
import { AvalancheCChainTestNetNetwork } from '../model/networks/avalanchecchain/avalanchecchain.testnet.network';
import { BSCMainNetNetwork } from '../model/networks/bsc/bsc.mainnet.network';
import { BSCTestNetNetwork } from '../model/networks/bsc/bsc.testnet.network';
import { BTCMainNetNetwork } from '../model/networks/btc/btc.mainnet.network';
import { BTCTestNetNetwork } from '../model/networks/btc/btc.testnet.network';
import { ElastosLRWNetwork } from '../model/networks/elastos/elastos.lrw.network';
import { ElastosMainNetNetwork } from '../model/networks/elastos/elastos.mainnet.network';
import { ElastosTestNetNetwork } from '../model/networks/elastos/elastos.testnet.network';
import { EthereumMainNetNetwork } from '../model/networks/ethereum/ethereum.mainnet.network';
import { EthereumRopstenNetwork } from '../model/networks/ethereum/ethereum.ropsten.network';
import { FantomMainNetNetwork } from '../model/networks/fantom/fantom.mainnet.network';
import { FantomTestNetNetwork } from '../model/networks/fantom/fantom.testnet.network';
import { FusionMainNetNetwork } from '../model/networks/fusion/fusion.mainnet.network';
import { HECOMainNetNetwork } from '../model/networks/heco/heco.mainnet.network';
import { HECOTestNetNetwork } from '../model/networks/heco/heco.testnet.network';
import { Network } from '../model/networks/network';
import { PolygonMainNetNetwork } from '../model/networks/polygon/polygon.mainnet.network';
import { PolygonTestNetNetwork } from '../model/networks/polygon/polygon.testnet.network';
import { TelosMainNetNetwork } from '../model/networks/telos/telos.mainnet.network';
import { TelosTestNetNetwork } from '../model/networks/telos/telos.testnet.network';
import { BridgeService } from './bridge.service';
import { ContactsService } from './contacts.service';
import { CurrencyService } from './currency.service';
import { CustomNetworkService } from './customnetwork.service';
import { DefiService } from './defi.service';
import { EarnService } from './earn.service';
import { ERC20CoinService } from './erc20coin.service';
import { EVMService } from './evm.service';
import { IntentService } from './intent.service';
import { NameResolvingService } from './nameresolving.service';
import { NavService } from './nav.service';
import { WalletNetworkService } from './network.service';
import { WalletPrefsService } from './pref.service';
import { SwapService } from './swap.service';
import { UiService } from './ui.service';
import { UniswapCurrencyService } from './uniswap.currency.service';
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
    private uniswapCurrencyService: UniswapCurrencyService,
    private contactsService: ContactsService,
    private prefs: WalletPrefsService,
    private uiService: UiService,
    private nameResolvingService: NameResolvingService,
    private networkService: WalletNetworkService,
    private customNetworkService: CustomNetworkService,
    private globalNetworksService: GlobalNetworksService,
    private ethTransactionService: EVMService,
    private earnService: EarnService, // IMPORTANT: unused, but keep it here for initialization
    private swapService: SwapService, // IMPORTANT: unused, but keep it here for initialization
    private bridgeService: BridgeService, // IMPORTANT: unused, but keep it here for initialization
    private defiService: DefiService, // IMPORTANT: unused, but keep it here for initialization
    private erc20CoinService: ERC20CoinService, // IMPORTANT: unused, but keep it here for initialization
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
    await this.uniswapCurrencyService.init();
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
    await this.swapService.init();

    // TMP TEST
    //await this.currencyV2Service.getTokenUSDValue(null, null);
  }

  public async onUserSignOut(): Promise<void> {
    await this.stop();
  }

  private async registerNetworks(): Promise<void> {
    let networkTemplate = this.globalNetworksService.activeNetworkTemplate.value;

    await this.createAndRegisterNetwork(new ElastosMainNetNetwork(), networkTemplate === MAINNET_TEMPLATE);
    await this.createAndRegisterNetwork(new BTCMainNetNetwork());
    await this.createAndRegisterNetwork(new EthereumMainNetNetwork());
    await this.createAndRegisterNetwork(new HECOMainNetNetwork());
    await this.createAndRegisterNetwork(new BSCMainNetNetwork());
    await this.createAndRegisterNetwork(new FusionMainNetNetwork());
    await this.createAndRegisterNetwork(new ArbitrumMainNetNetwork());
    await this.createAndRegisterNetwork(new PolygonMainNetNetwork());
    await this.createAndRegisterNetwork(new FantomMainNetNetwork());
    await this.createAndRegisterNetwork(new AvalancheCChainMainNetNetwork());
    await this.createAndRegisterNetwork(new TelosMainNetNetwork());

    await this.createAndRegisterNetwork(new ElastosTestNetNetwork(), networkTemplate === TESTNET_TEMPLATE);
    await this.createAndRegisterNetwork(new BTCTestNetNetwork());
    await this.createAndRegisterNetwork(new EthereumRopstenNetwork());
    await this.createAndRegisterNetwork(new HECOTestNetNetwork());
    await this.createAndRegisterNetwork(new BSCTestNetNetwork());
    // await this.createAndRegisterNetwork(new ArbitrumTestNetNetwork());
    await this.createAndRegisterNetwork(new PolygonTestNetNetwork());
    await this.createAndRegisterNetwork(new FantomTestNetNetwork());
    await this.createAndRegisterNetwork(new AvalancheCChainTestNetNetwork());
    await this.createAndRegisterNetwork(new TelosTestNetNetwork());

    await this.createAndRegisterNetwork(new ElastosLRWNetwork(), networkTemplate === "LRW");
  }

  private async createAndRegisterNetwork(network: Network, isDefault = false): Promise<void> {
    let networkTemplate = this.globalNetworksService.activeNetworkTemplate.value;

    // Initialize the network, only if the network belongs to the active network template
    if (network.networkTemplate === networkTemplate)
      await network.init();

    // Register all networks, no matter if they are for the active network template or not,
    // as they are sometimes needed.
    await this.networkService.registerNetwork(network, isDefault);
  }

  private registerNameResolvers() {
    this.nameResolvingService.registerNameResolver(new CryptoNameResolver(this.httpClient));
    this.nameResolvingService.registerNameResolver(new UnstoppableDomainsAddressResolver(this.httpClient));
    this.nameResolvingService.registerNameResolver(new IdrissResolver());
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
