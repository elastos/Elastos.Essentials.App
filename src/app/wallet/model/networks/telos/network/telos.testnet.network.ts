import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { TelosBaseNetwork } from "./telos.base.network";

export class TelosTestNetNetwork extends TelosBaseNetwork {
  constructor() {
    super(
      "telos",
      "Telos EVM Testnet",
      "assets/wallet/networks/telos.png",
      "TLOS",
      "Telos",
      TESTNET_TEMPLATE,
      41,
      [
      ]
    );

    this.averageBlocktime = 5 // 2;
  }
}