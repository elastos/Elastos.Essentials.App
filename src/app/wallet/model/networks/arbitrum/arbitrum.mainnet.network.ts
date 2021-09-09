import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { EVMNetwork } from "../evm.network";
import { ArbitrumAPI, ArbitrumApiType } from "./arbitrum.api";

export class ArbitrumMainNetNetwork extends EVMNetwork {
  constructor() {
    super(
      "arbitrum",
      "Arbitrum One",
      "assets/wallet/networks/arbitrum.svg",
      "AETH",
      "Arbitrum ETH",
      ArbitrumAPI.getApiUrl(ArbitrumApiType.RPC, MAINNET_TEMPLATE),
      ArbitrumAPI.getApiUrl(ArbitrumApiType.ACCOUNT_RPC, MAINNET_TEMPLATE),
      MAINNET_TEMPLATE,
      42161
    );
  }
}
