import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { HooBaseNetwork } from "./hoo.base.network";

export class HooTestNetNetwork extends HooBaseNetwork {
  constructor() {
    super(
      "hoosmartchain",
      "Hoo Smart Chain Testnet",
      "assets/wallet/networks/hoo.png",
      "HOO",
      "HOO",
      TESTNET_TEMPLATE,
      170,
    );

    this.averageBlocktime = 5;
  }
}
