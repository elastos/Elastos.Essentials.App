import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalNetworksService, MAINNET_TEMPLATE, TESTNET_TEMPLATE } from 'src/app/services/global.networks.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { CryptoNameResolver } from '../model/address-resolvers';
import { ELADomainResolver } from '../model/address-resolvers/resolvers/ELADomainAddressResolver';
import { ENSResolver } from '../model/address-resolvers/resolvers/ENSAddressResolver';
import { IdrissResolver } from '../model/address-resolvers/resolvers/IdrissAddressResolver';
import { UnstoppableDomainsAddressResolver } from '../model/address-resolvers/resolvers/UnstoppableDomainsAddressResolver';
import { ArbitrumMainNetNetwork } from '../model/networks/arbitrum/network/arbitrum.mainnet.network';
import { ArbitrumTestNetNetwork } from '../model/networks/arbitrum/network/arbitrum.testnet.network';
import { AvalancheCChainMainNetNetwork } from '../model/networks/avalanchecchain/network/avalanchecchain.mainnet.network';
import { AvalancheCChainTestNetNetwork } from '../model/networks/avalanchecchain/network/avalanchecchain.testnet.network';
import { BSCMainNetNetwork } from '../model/networks/bsc/network/bsc.mainnet.network';
import { BSCTestNetNetwork } from '../model/networks/bsc/network/bsc.testnet.network';
import { BTCMainNetNetwork } from '../model/networks/btc/network/btc.mainnet.network';
import { BTCTestNetNetwork } from '../model/networks/btc/network/btc.testnet.network';
import { CeloMainNetNetwork } from '../model/networks/celo/network/celo.mainnet.network';
import { CeloTestNetNetwork } from '../model/networks/celo/network/celo.testnet.network';
import { CronosMainNetNetwork } from '../model/networks/cronos/network/cronos.mainnet.network';
import { CronosTestNetNetwork } from '../model/networks/cronos/network/cronos.testnet.network';
import { ElastosIdentityChainMainNetNetwork, ElastosIdentityChainTestNetNetwork } from '../model/networks/elastos/evms/eid/network/eid.networks';
import { ElastosSmartChainMainNetNetwork, ElastosSmartChainTestNetNetwork } from '../model/networks/elastos/evms/esc/network/esc.networks';
import { ElastosLRWNetwork } from '../model/networks/elastos/lrw/network/elastos.lrw.network';
import { ElastosMainChainMainNetNetwork, ElastosMainChainTestNetNetwork } from '../model/networks/elastos/mainchain/network/elastos.networks';
import { EthereumGoerliNetwork } from '../model/networks/ethereum/network/ethereum.goerli.network';
import { EthereumMainNetNetwork } from '../model/networks/ethereum/network/ethereum.mainnet.network';
import { EvmosMainNetNetwork } from '../model/networks/evmos/network/evmos.mainnet.network';
import { EvmosTestNetNetwork } from '../model/networks/evmos/network/evmos.testnet.network';
import { FantomMainNetNetwork } from '../model/networks/fantom/network/fantom.mainnet.network';
import { FantomTestNetNetwork } from '../model/networks/fantom/network/fantom.testnet.network';
import { FuseMainNetNetwork } from '../model/networks/fuse/network/fuse.mainnet.network';
import { FusionMainNetNetwork } from '../model/networks/fusion/network/fusion.mainnet.network';
import { FusionTestNetNetwork } from '../model/networks/fusion/network/fusion.testnet.network';
import { GnosisMainNetNetwork } from '../model/networks/gnosis/network/gnosis.mainnet.network';
import { HECOMainNetNetwork } from '../model/networks/heco/network/heco.mainnet.network';
import { HECOTestNetNetwork } from '../model/networks/heco/network/heco.testnet.network';
import { HooMainNetNetwork } from '../model/networks/hoo/network/hoo.mainnet.network';
import { HooTestNetNetwork } from '../model/networks/hoo/network/hoo.testnet.network';
import { IoTeXMainNetNetwork } from '../model/networks/iotex/network/iotex.mainnet.network';
import { IoTeXTestNetNetwork } from '../model/networks/iotex/network/iotex.testnet.network';
import { KavaMainNetNetwork } from '../model/networks/kava/network/kava.mainnet.network';
import { KavaTestNetNetwork } from '../model/networks/kava/network/kava.testnet.network';
import { AnyNetwork } from '../model/networks/network';
import { PolygonMainNetNetwork } from '../model/networks/polygon/network/polygon.mainnet.network';
import { PolygonTestNetNetwork } from '../model/networks/polygon/network/polygon.testnet.network';
import { TelosMainNetNetwork } from '../model/networks/telos/network/telos.mainnet.network';
import { TelosTestNetNetwork } from '../model/networks/telos/network/telos.testnet.network';
import { TronMainNetNetwork } from '../model/networks/tron/network/tron.mainnet.network';
import { TronShastaTestNetNetwork } from '../model/networks/tron/network/tron.shasta.network';
import { ContactsService } from './contacts.service';
import { CurrencyService } from './currency.service';
import { BridgeService } from './evm/bridge.service';
import { CustomNetworkService } from './evm/customnetwork.service';
import { DefiService } from './evm/defi.service';
import { EarnService } from './evm/earn.service';
import { ERC20CoinService } from './evm/erc20coin.service';
import { EVMService } from './evm/evm.service';
import { SwapService } from './evm/swap.service';
import { UniswapCurrencyService } from './evm/uniswap.currency.service';
import { IntentService } from './intent.service';
import { NameResolvingService } from './nameresolving.service';
import { NavService } from './nav.service';
import { WalletNetworkService } from './network.service';
import { WalletPrefsService } from './pref.service';
import { TRC20CoinService } from './tvm/trc20coin.service';
import { UiService } from './ui.service';
import { WalletService } from './wallet.service';
import { WalletUIService } from './wallet.ui.service';

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
    private events: GlobalEvents,
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
    private erc20CoinService: ERC20CoinService,
    private tron20CoinSerice: TRC20CoinService,
    private walletUIService: WalletUIService, // IMPORTANT: unused, but keep it here for initialization
    private httpClient: HttpClient
  ) {
    super();
  }

  public init(): Promise<void> {
    GlobalServiceManager.getInstance().registerService(this);
    return;
  }

  public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    Logger.log("Wallet", "Wallet init service is initializing");

    await this.prefs.init();

    // Networks init + registration
    await this.networkService.init();
    await this.customNetworkService.init();
    await this.registerNetworks();
    await this.erc20CoinService.init();
    await this.tron20CoinSerice.init();

    // Register name resolvers
    this.registerNameResolvers();

    // Do not await.
    await this.currencyService.init(); // Currency cache must be ready for other services
    void this.uniswapCurrencyService.init();
    void this.contactsService.init();
    void this.ethTransactionService.init();

    await this.uiService.init();

    // TODO: dirty, rework this
    this.subscription = this.events.subscribe("walletmanager:initialized", () => {
      Logger.log("wallet", "walletmanager:initialized event received");
      this.walletServiceInitialized = true;
    });

    void this.walletManager.init().then(async () => {
      await this.intentService.init();
      await this.swapService.init();
    });
  }

  public async onUserSignOut(): Promise<void> {
    await this.stop();
  }

  private async registerNetworks(): Promise<void> {
    let networkTemplate = this.globalNetworksService.activeNetworkTemplate.value;

    // Register all networks, no matter if they are for the active network template or not,
    // as they are sometimes needed.
    await this.createAndRegisterNetwork(new ElastosMainChainMainNetNetwork());
    await this.createAndRegisterNetwork(new ElastosSmartChainMainNetNetwork(), networkTemplate === MAINNET_TEMPLATE);
    await this.createAndRegisterNetwork(new ElastosIdentityChainMainNetNetwork());
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
    await this.createAndRegisterNetwork(new IoTeXMainNetNetwork());
    await this.createAndRegisterNetwork(new HooMainNetNetwork());
    await this.createAndRegisterNetwork(new GnosisMainNetNetwork());
    await this.createAndRegisterNetwork(new FuseMainNetNetwork());
    await this.createAndRegisterNetwork(new CronosMainNetNetwork());
    await this.createAndRegisterNetwork(new KavaMainNetNetwork());
    await this.createAndRegisterNetwork(new EvmosMainNetNetwork());
    await this.createAndRegisterNetwork(new TronMainNetNetwork());
    await this.createAndRegisterNetwork(new CeloMainNetNetwork());

    await this.createAndRegisterNetwork(new ElastosMainChainTestNetNetwork());
    await this.createAndRegisterNetwork(new ElastosSmartChainTestNetNetwork(), networkTemplate === TESTNET_TEMPLATE);
    await this.createAndRegisterNetwork(new ElastosIdentityChainTestNetNetwork());
    await this.createAndRegisterNetwork(new BTCTestNetNetwork());
    await this.createAndRegisterNetwork(new EthereumGoerliNetwork());
    await this.createAndRegisterNetwork(new HECOTestNetNetwork());
    await this.createAndRegisterNetwork(new BSCTestNetNetwork());
    await this.createAndRegisterNetwork(new FusionTestNetNetwork());
    await this.createAndRegisterNetwork(new ArbitrumTestNetNetwork());
    await this.createAndRegisterNetwork(new PolygonTestNetNetwork());
    await this.createAndRegisterNetwork(new FantomTestNetNetwork());
    await this.createAndRegisterNetwork(new AvalancheCChainTestNetNetwork());
    await this.createAndRegisterNetwork(new TelosTestNetNetwork());
    await this.createAndRegisterNetwork(new IoTeXTestNetNetwork());
    await this.createAndRegisterNetwork(new HooTestNetNetwork());
    await this.createAndRegisterNetwork(new CronosTestNetNetwork());
    await this.createAndRegisterNetwork(new KavaTestNetNetwork());
    await this.createAndRegisterNetwork(new EvmosTestNetNetwork());
    await this.createAndRegisterNetwork(new TronShastaTestNetNetwork());
    await this.createAndRegisterNetwork(new CeloTestNetNetwork());

    await this.createAndRegisterNetwork(new ElastosLRWNetwork(), networkTemplate === "LRW");

    this.networkService.notifyAllNetworksRegistered();
  }

  private async createAndRegisterNetwork(network: AnyNetwork, isDefault = false): Promise<void> {
    let networkTemplate = this.globalNetworksService.activeNetworkTemplate.value;

    //Logger.log("wallet", "Register network in", network.key);

    // Initialize the network, only if the network belongs to the active network template
    if (network.networkTemplate === networkTemplate)
      await network.init();

    //Logger.log("wallet", "Register network before register", network.key);

    // Register all networks, no matter if they are for the active network template or not,
    // as they are sometimes needed.
    await this.networkService.registerNetwork(network, isDefault);

    //Logger.log("wallet", "Register network out", network.key);
  }

  private registerNameResolvers() {
    this.nameResolvingService.registerNameResolver(new CryptoNameResolver(this.httpClient));
    this.nameResolvingService.registerNameResolver(new UnstoppableDomainsAddressResolver(this.httpClient));
    this.nameResolvingService.registerNameResolver(new IdrissResolver());
    this.nameResolvingService.registerNameResolver(new ENSResolver());
    this.nameResolvingService.registerNameResolver(new ELADomainResolver());
  }

  public async stop(): Promise<void> {
    Logger.log('wallet', 'init service stopping')
    await this.prefs.stop();
    this.currencyService.stop();
    await this.walletManager.stop();
    await this.intentService.stop();
    this.networkService.stop();
    this.nameResolvingService.reset();
    this.tron20CoinSerice.stop();

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
        Logger.log("wallet", "Wallet init service is initializing, The Wallet will be displayed when the service is initialized.");
      }
    }
  }
}
