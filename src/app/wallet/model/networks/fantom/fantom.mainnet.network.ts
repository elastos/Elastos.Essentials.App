import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { EVMNetwork } from "../evm.network";
import { FantomAPI, FantomApiType } from "./fantom.api";

export class FantomMainNetNetwork extends EVMNetwork {
  constructor() {
    super(
      "fantom",
      "FANTOM",
      "assets/wallet/networks/fantom.png",
      "FTM",
      "Fantom Token",
      FantomAPI.getApiUrl(FantomApiType.RPC, MAINNET_TEMPLATE),
      FantomAPI.getApiUrl(FantomApiType.ACCOUNT_RPC, MAINNET_TEMPLATE),
      MAINNET_TEMPLATE,
      250
    );
  }
}
