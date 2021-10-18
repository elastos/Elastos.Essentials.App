import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { EVMNetwork } from "../evm.network";
import { PolygonAPI, PolygonAPIType } from "./polygon.api";

export class PolygonTestNetNetwork extends EVMNetwork {
  constructor() {
    super(
      "polygon",
      "Polygon Mumbai (Goërli)",
      "assets/wallet/networks/polygon.png",
      "MATIC",
      "Polygon Coin",
      PolygonAPI.getApiUrl(PolygonAPIType.RPC, TESTNET_TEMPLATE),
      PolygonAPI.getApiUrl(PolygonAPIType.ACCOUNT_RPC, TESTNET_TEMPLATE),
      TESTNET_TEMPLATE,
      80001,
    );

    this.averageBlocktime = 5;
  }
}
