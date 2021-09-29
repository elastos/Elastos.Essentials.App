import { binanceBaseProvider } from "../../../earn/baseproviders/binance.provider";
import { glideBaseProvider } from "../../../earn/baseproviders/glide.provider";
import { shadowTokenBaseProvider } from "../../../earn/baseproviders/shadowtoken.provider";
import { BridgeProvider } from "../../../earn/bridgeprovider";

export const ethereumMainnetBinanceBridgeProvider = new BridgeProvider(
  binanceBaseProvider,
  true,
  [
    "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
  ],
  "https://www.binance.org/en/bridge",
);

export const ethereumMainnetShadowTokenBridgeProvider = new BridgeProvider(
  shadowTokenBaseProvider,
  true, // ETH
  [
    "0xe6fd75ff38Adca4B97FBCD938c86b98772431867" // ELA on ethereum
  ]
);

export const ethereumMainnetGlideBridgeProvider = new BridgeProvider(
  glideBaseProvider,
  true, // ETH
  [
    "0xe6fd75ff38Adca4B97FBCD938c86b98772431867", // ELA on Ethereum
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
  ]
);