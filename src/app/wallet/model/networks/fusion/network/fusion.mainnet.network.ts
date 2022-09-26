import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { FusionBaseNetwork } from "./fusion.base.network";

// Explorer: https://fsnex.com/
export class FusionMainNetNetwork extends FusionBaseNetwork {
  constructor() {
    super(
      "fusion",
      "Fusion",
      "Fusion",
      "assets/wallet/networks/fusion.png",
      "FSN",
      "FSN",
      MAINNET_TEMPLATE,
      32659,
      []
    );

    this.averageBlocktime = 5;
  }
}
