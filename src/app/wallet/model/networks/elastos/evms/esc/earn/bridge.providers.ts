import { elkBaseProvider } from "../../../../../earn/baseproviders/elk.provider";
import { glideBaseProvider } from "../../../../../earn/baseproviders/glide.provider";
import { shadowTokenBaseProvider } from "../../../../../earn/baseproviders/shadowtoken.provider";
import { BridgeProvider } from "../../../../../earn/bridgeprovider";

export const elastosMainnetShadowTokenBridgeProvider = new BridgeProvider(
  shadowTokenBaseProvider,
  true,
  [
    "0xeceefC50f9aAcF0795586Ed90a8b9E24f55Ce3F3", // HT on Elastos
    "0xb9ae03e3320235d3a8ae537f87ff8529b445b590", // htFilda - HT on Filda on Elastos
  ]
);

export const elastosMainnetGlideBridgeProvider = new BridgeProvider(
  glideBaseProvider,
  true,
  [
    "0xeceefC50f9aAcF0795586Ed90a8b9E24f55Ce3F3", // HT on Elastos
    "0xF9Ca2eA3b1024c0DB31adB224B407441bECC18BB", // Heco-Peg HUSD Token on Elastos (htHUSD)
  ]
);

export const elastosMainnetElkBridgeProvider = new BridgeProvider(
  elkBaseProvider,
  false,
  [
    "0xe1c110e1b1b4a1ded0caf3e42bfbdbb7b5d7ce1c", // oELK
    "0xeeeeeb57642040be42185f49c52f7e9b38f8eeee" // ELK
  ]
);