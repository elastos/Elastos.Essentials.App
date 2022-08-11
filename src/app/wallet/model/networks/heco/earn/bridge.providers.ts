import { elkBaseProvider } from "../../../earn/baseproviders/elk.provider";
import { glideBaseProvider } from "../../../earn/baseproviders/glide.provider";
import { o3swapBaseProvider } from "../../../earn/baseproviders/o3swap.provider";
import { shadowTokenBaseProvider } from "../../../earn/baseproviders/shadowtoken.provider";
import { BridgeProvider } from "../../../earn/bridgeprovider";

export const hecoMainnetO3BridgeProvider = new BridgeProvider(
  o3swapBaseProvider,
  false,
  [
    "0x0298c2b32eae4da002a15f36fdf7615bea3da047", // hUSD
    "0x64ff637fb478863b7468bc97d30a5bf3a428a1fd" // hETH
    // TODO
  ],
  "https://o3swap.com/hub"
);

export const hecoMainnetShadowTokenBridgeProvider = new BridgeProvider(
  shadowTokenBaseProvider,
  true, // HT
  [
    "0xe36ffd17b2661eb57144ceaef942d95295e637f0" // FilDA
  ]
);

export const hecoMainnetGlideBridgeProvider = new BridgeProvider(
  glideBaseProvider,
  true, // HT
  [
    "0x0298c2b32eae4da002a15f36fdf7615bea3da047", // hUSD
    "0xa1ecfc2bec06e4b43ddd423b94fef84d0dbc8f5c", // ELA on HuobiChain
  ]
);

export const hecoMainnetElkBridgeProvider = new BridgeProvider(
  elkBaseProvider,
  false,
  [
    "0xe1c110e1b1b4a1ded0caf3e42bfbdbb7b5d7ce1c", // oELK
    "0xeeeeeb57642040be42185f49c52f7e9b38f8eeee" // ELK
  ]
);