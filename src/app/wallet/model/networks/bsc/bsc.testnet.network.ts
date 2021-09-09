import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { EVMNetwork } from "../evm.network";
import { BscAPI, BscApiType } from "./bsc.api";

export class BSCTestNetNetwork extends EVMNetwork {
  constructor() {
    super(
      "bsc",
      "BSC Testnet",
      "assets/wallet/networks/bscchain.png",
      "BNB",
      "Binance Coin",
      BscAPI.getApiUrl(BscApiType.RPC, TESTNET_TEMPLATE),
      BscAPI.getApiUrl(BscApiType.ACCOUNT_RPC, TESTNET_TEMPLATE),
      TESTNET_TEMPLATE,
      97
    );
  }
}
