import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { BaseChainMainnetUniswapCurrencyProvider } from "../currency/basechain.uniswap.currency.provider";
import { BaseChainNetwork } from "./basechain.network";

export class BaseChainMainNetNetwork extends BaseChainNetwork {
  private uniswapCurrencyProvider: BaseChainMainnetUniswapCurrencyProvider = null;

  constructor() {
    super("base",
      "Base",
      "Base",
      "assets/wallet/networks/base.svg",
      "ETH",
      "Base ETH",
      MAINNET_TEMPLATE,
      8453,
      [],
      [
        {
          name: 'Base Mainnet RPC',
          url: 'https://mainnet.base.org'
        },
        {
          name: 'PublicNode',
          url: 'https://base-rpc.publicnode.com'
        }
      ]);

    // Built-in tokens — addresses verified against BaseScan ("Exact Match") + issuer sources.
    this.builtInCoins = [
      new ERC20Coin(this, "USDC", "USD Coin", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", 6, false, true),
      new ERC20Coin(this, "WETH", "Wrapped Ether", "0x4200000000000000000000000000000000000006", 18, false, true),
      new ERC20Coin(this, "DAI", "Dai Stablecoin", "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", 18, false, true),
      new ERC20Coin(this, "cbETH", "Coinbase Wrapped Staked ETH", "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22", 18, false)
    ];

    this.uniswapCurrencyProvider = new BaseChainMainnetUniswapCurrencyProvider(this);
    this.averageBlocktime = 2;

    // Public RPC / Blockscout are rate-limited; throttle to be safe.
    GlobalJsonRPCService.instance.registerLimitator(this.key, {
      minRequestsInterval: 200
    });
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }
}
