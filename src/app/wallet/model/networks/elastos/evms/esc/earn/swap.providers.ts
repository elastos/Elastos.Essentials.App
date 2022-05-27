import { elkBaseProvider } from "../../../../../earn/baseproviders/elk.provider";
import { glideBaseProvider } from "../../../../../earn/baseproviders/glide.provider";
import { SwapProvider } from "../../../../../earn/swapprovider";

export const elastosMainnetGlideSwapProvider = new SwapProvider(
  glideBaseProvider,
  true,
  [
    "0xeceefC50f9aAcF0795586Ed90a8b9E24f55Ce3F3", // HT on Elastos
    "0xA06be0F5950781cE28D965E5EFc6996e88a8C141", // USDC on Elastos
    "0xF9Ca2eA3b1024c0DB31adB224B407441bECC18BB", // Heco-Peg HUSD Token on Elastos (htHUSD)
    // TODO: WELA - Find the right address
  ],
  [
  ],
  "https://glidefinance.io/swap?inputCurrency=${inputCurrency}"
);

export const elastosMainnetElkSwapProvider = new SwapProvider(
  elkBaseProvider,
  true,
  [],
  [
    "https://raw.githubusercontent.com/elkfinance/tokens/main/elastos.tokenlist.json"
  ],
  "https://app.elk.finance/#/swap?inputCurrency=${inputCurrency}"
);