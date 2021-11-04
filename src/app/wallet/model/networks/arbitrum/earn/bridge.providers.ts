import { elkBaseProvider } from "../../../earn/baseproviders/elk.provider";
import { BridgeProvider } from "../../../earn/bridgeprovider";

export const arbitrumMainnetElkBridgeProvider = new BridgeProvider(
  elkBaseProvider,
  false,
  [
    "0xe1c110e1b1b4a1ded0caf3e42bfbdbb7b5d7ce1c", // ELK
  ]
);