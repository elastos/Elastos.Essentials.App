import { binanceBaseProvider } from "../../../earn/baseproviders/binance.provider";
import { shadowTokenBaseProvider } from "../../../earn/baseproviders/shadowtoken.provider";
import { BridgeProvider } from "../../../earn/bridgeprovider";

export const bscMainnetBinanceBridgeProvider = new BridgeProvider(
  binanceBaseProvider,
  true,
  [
    "0x55d398326f99059fF775485246999027B3197955", // USDT
    "0x2170ed0880ac9a755fd29b2688956bd959f933f8", // ETH
    "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c", // BTC
    "0x8fF795a6F4D97E7887C79beA79aba5cc76444aDf", // BCH
    "0x7083609fce4d1d8dc0c979aab8c869ea2c873402", // DOT
    "0x0D8Ce2A99Bb6e3B7Db580eD848240e4a0F9aE153", // FIL
    "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3", // DAI
    "0x4338665cbb7b2485a8855a139b75d5e34ab0db94", // LTC
    "0x0eb3a705fc54725037cc9e008bdede697f62f335", // ATOM
    "0xfd7b3a77848f1c2d67e05e54d78d174a0c850335", // ONT
    "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47", // ADA
    "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD", // LINK
    "0x56b6fb708fc5732dec1afc8d8556423a2edccbd6", // EOS
    "0xad6caeb32cd2c308980a548bd0bc5aa4306c6c18", // BAND
    "0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe", // XRP
    "0x101d82428437127bF1608F699CD651e6Abf9766E", // BAT
    "0xBf5140A22578168FD562DCcF235E5D43A02ce9B1", // UNI
    "0xe9e7cea3dedca5984780bafc599bd69add087d56", // BUSD
    "0x52ce071bd9b1c4b00a0b92d298c512478cad67e8", // COMP
    "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC
    "0x3d6545b08693daE087E957cb1180ee38B9e3c25E", // ETC
    "0xbA2aE424d960c26247Dd6c32edC70B295c744C43", // DOGE
    "0x947950bcc74888a40ffa2593c5798f11fc9124c4", // SUSHI
    "0xfb6115445bff7b52feb98650c87f44907e58f802", // AAVE
    "0x67ee3Cb086F8a16f34beE3ca72FAD36F7Db929e2", // DODO
    "0x8cd6e29d3686d24d3c2018cee54621ea0f89313b", // NULS
    "0xcc42724c6683b7e57334c4e856f4c9965ed682bd", // MATIC
    "0x1ce0c2827e2ef14d5c4f29a091d735a204794041", // AVAX
    "0x85eac5ac2f758618dfa09bdbe0cf174e7d574d5b", // TRX
    "0x14016e85a25aeb13065688cafb43044c2ef86784", // TUSD
    "0xc17C1Bc4F46C7CeA215f4A7b2a4f74A04c1095fA", // SUN
  ],
  "https://www.binance.org/en/bridge"
);

export const bscMainnetShadowTokenBridgeProvider = new BridgeProvider(
  shadowTokenBaseProvider,
  true, // BNB
  [
    "0x8b45796da30a87d8459e1b16fbf106b664ee01e1" // Filda on BSC
  ]
);