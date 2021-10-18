import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { EVMNetwork } from "../evm.network";
import { HecoAPI, HecoApiType } from "./heco.api";

export class HECOTestNetNetwork extends EVMNetwork {
  constructor() {
    super(
      "heco",
      "Heco Testnet",
      "assets/wallet/networks/hecochain.png",
      "HT",
      "Huobi Token",
      HecoAPI.getApiUrl(HecoApiType.RPC, TESTNET_TEMPLATE),
      HecoAPI.getApiUrl(HecoApiType.ACCOUNT_RPC, TESTNET_TEMPLATE),
      TESTNET_TEMPLATE,
      256,
    );

    this.averageBlocktime = 5;
  }
}
