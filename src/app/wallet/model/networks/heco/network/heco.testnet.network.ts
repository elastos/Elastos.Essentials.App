import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { HecoBaseNetwork } from "./heco.base.network";

export class HECOTestNetNetwork extends HecoBaseNetwork {
  constructor() {
    super(
      "heco",
      "Heco Testnet",
      "Heco Testnet",
      "assets/wallet/networks/hecochain.png",
      "HT",
      "Huobi Token",
      TESTNET_TEMPLATE,
      256,
    );

    this.averageBlocktime = 5;
  }
}
