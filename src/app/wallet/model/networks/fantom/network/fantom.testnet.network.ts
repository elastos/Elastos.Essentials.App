import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { FantomBaseNetwork } from "./fantom.base.network";

export class FantomTestNetNetwork extends FantomBaseNetwork {
  constructor() {
    super(
      "fantom",
      "Fantom Testnet",
      "Fantom Testnet",
      "assets/wallet/networks/fantom.png",
      "FTM",
      "Fantom Token",
      TESTNET_TEMPLATE,
      4002,
    );

    this.averageBlocktime = 5 // 1;
  }
}
