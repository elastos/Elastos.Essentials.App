import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { BttcBaseNetwork } from "./bttc.base.network";

export class BttcTestNetNetwork extends BttcBaseNetwork {
  constructor() {
    super(
      "bttc",
      "BTTC-testnet",
      "BTTC-testnet",
      "assets/wallet/networks/bittorrent.svg",
      "BTT",
      "BTTC Coin",
      TESTNET_TEMPLATE,
      1029,
    );

    this.averageBlocktime = 5
  }
}
