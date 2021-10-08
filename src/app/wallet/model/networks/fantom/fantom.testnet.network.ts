import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { EVMNetwork } from "../evm.network";
import { FantomAPI, FantomApiType } from "./fantom.api";

export class FantomTestNetNetwork extends EVMNetwork {
  constructor() {
    super(
      "fantom",
      "Fantom Testnet",
      "assets/wallet/networks/fantom.png",
      "FTM",
      "Fantom Token",
      FantomAPI.getApiUrl(FantomApiType.RPC, TESTNET_TEMPLATE),
      FantomAPI.getApiUrl(FantomApiType.ACCOUNT_RPC, TESTNET_TEMPLATE),
      TESTNET_TEMPLATE,
      4002
    );
  }
}
