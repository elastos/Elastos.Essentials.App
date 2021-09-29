import { o3swapBaseProvider } from "../../../earn/baseproviders/o3swap.provider";
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
