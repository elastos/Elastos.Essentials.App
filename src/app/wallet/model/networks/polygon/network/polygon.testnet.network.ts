import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { PolygonBaseNetwork } from "./polygon.base.network";

export class PolygonTestNetNetwork extends PolygonBaseNetwork {
  constructor() {
    super(
      "polygon",
      "Polygon Mumbai (Goërli)",
      "assets/wallet/networks/polygon.png",
      "MATIC",
      "Polygon Coin",
      TESTNET_TEMPLATE,
      80001,
    );

    this.averageBlocktime = 5;
  }
}
