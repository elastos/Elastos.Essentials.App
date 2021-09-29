import { binanceBaseProvider } from "../../../earn/baseproviders/binance.provider";
import { BridgeProvider } from "../../../earn/bridgeprovider";

export const ethereumMainnetBinanceBridgeProvider = new BridgeProvider(
  binanceBaseProvider,
  [
    "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
  ],
  "https://www.binance.org/en/bridge",
);
