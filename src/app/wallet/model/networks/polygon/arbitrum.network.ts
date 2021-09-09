import { EVMNetwork } from "../evm.network";
import { ArbitrumAPI, ArbitrumApiType } from "./arbitrum.api";

export class ArbitrumNetwork extends EVMNetwork {
  constructor() {
    super(
      "arbitrum",
      "Arbitrum One",
      "assets/wallet/networks/arbitrum.svg",
      "AETH",
      "Arbitrum ETH",
      ArbitrumAPI.getApiUrl(ArbitrumApiType.RPC),
      ArbitrumAPI.getApiUrl(ArbitrumApiType.ACCOUNT_RPC),
      {
        "MainNet": {
          chainID: 42161
        },
        "TestNet": {
          chainID: 421611
        }
      }
    );
  }
}
