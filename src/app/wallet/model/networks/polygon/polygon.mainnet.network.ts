import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../coin";
import { EVMNetwork } from "../evm.network";
import { PolygonAPI, PolygonAPIType } from "./polygon.api";

export class PolygonMainNetNetwork extends EVMNetwork {
  constructor() {
    super(
      "polygon",
      "Polygon",
      "assets/wallet/networks/polygon.png",
      "MATIC",
      "Polygon Coin",
      PolygonAPI.getApiUrl(PolygonAPIType.RPC, MAINNET_TEMPLATE),
      PolygonAPI.getApiUrl(PolygonAPIType.ACCOUNT_RPC, MAINNET_TEMPLATE),
      MAINNET_TEMPLATE,
      137,
      [
        new ERC20Coin("USDT", "USDT", "USDT", "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", MAINNET_TEMPLATE, false, true),
        new ERC20Coin("BNB", "BNB", "Binance Coin", "0x3BA4c387f786bFEE076A58914F5Bd38d668B42c3", MAINNET_TEMPLATE, false, true),
        new ERC20Coin("USDC", "USDC", "USDC", "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", MAINNET_TEMPLATE, false, true),
        new ERC20Coin("LINK", "LINK", "ChainLink", "0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39", MAINNET_TEMPLATE, false, true),
        new ERC20Coin("UNI", "UNI", "Uniswap", "0xb33eaad8d922b1083446dc23f610c2567fb5180f", MAINNET_TEMPLATE, false, true),
      ]
    );
  }
}
