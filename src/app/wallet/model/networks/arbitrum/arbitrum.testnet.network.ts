import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { EVMNetwork } from "../evm.network";
import { ArbitrumAPI, ArbitrumApiType } from "./arbitrum.api";

export class ArbitrumTestNetNetwork extends EVMNetwork {
  constructor() {
    super(
      "arbitrum",
      "Arbitrum One Testnet",
      "assets/wallet/networks/arbitrum.svg",
      "AETH",
      "Arbitrum ETH",
      ArbitrumAPI.getApiUrl(ArbitrumApiType.RPC, TESTNET_TEMPLATE),
      ArbitrumAPI.getApiUrl(ArbitrumApiType.EXPLORER, TESTNET_TEMPLATE),
      TESTNET_TEMPLATE,
      421611,
    );

    this.averageBlocktime = 15 //;
  }
}
