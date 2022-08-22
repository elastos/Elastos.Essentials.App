import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ArbitrumBaseNetwork } from "./arbitrum.base.network";

export class ArbitrumTestNetNetwork extends ArbitrumBaseNetwork {
  constructor() {
    super(
      "arbitrum",
      "Arbitrum One Testnet",
      "Arbitrum Testnet",
      "assets/wallet/networks/arbitrum.svg",
      "AETH",
      "Arbitrum ETH",
      TESTNET_TEMPLATE,
      421611,
    );

    this.averageBlocktime = 15 //;
  }
}
