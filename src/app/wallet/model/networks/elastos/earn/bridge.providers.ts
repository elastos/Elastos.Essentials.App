import { shadowTokenBaseProvider } from "../../../earn/baseproviders/shadowtoken.provider";
import { BridgeProvider } from "../../../earn/bridgeprovider";

export const elastosMainnetShadowTokenBridgeProvider = new BridgeProvider(
  shadowTokenBaseProvider,
  true,
  [
    "0xeceefC50f9aAcF0795586Ed90a8b9E24f55Ce3F3", // HT on Elastos
    "0xb9ae03e3320235d3a8ae537f87ff8529b445b590", // htFilda - HT on Filda on Elastos
  ]
);