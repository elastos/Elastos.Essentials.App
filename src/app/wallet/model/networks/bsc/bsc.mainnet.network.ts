import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../coin";
import { EVMNetwork } from "../evm.network";
import { BscAPI, BscApiType } from "./bsc.api";

export class BSCMainNetNetwork extends EVMNetwork {
  constructor() {
    super(
      "bsc",
      "BSC",
      "assets/wallet/networks/bscchain.png",
      "BNB",
      "Binance Coin",
      BscAPI.getApiUrl(BscApiType.RPC, MAINNET_TEMPLATE),
      BscAPI.getApiUrl(BscApiType.ACCOUNT_RPC, MAINNET_TEMPLATE),
      MAINNET_TEMPLATE,
      56,
      [
        new ERC20Coin("ETH", "ETH", "Binance ETH", "0x2170ed0880ac9a755fd29b2688956bd959f933f8", MAINNET_TEMPLATE, false, true),
        new ERC20Coin("ADA", "ADA", "Binance ADA", "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47", MAINNET_TEMPLATE, false),
        new ERC20Coin("USDT", "USDT", "Binance USDT", "0x55d398326f99059ff775485246999027b3197955", MAINNET_TEMPLATE, false, true)
      ]
    );
  }
}
