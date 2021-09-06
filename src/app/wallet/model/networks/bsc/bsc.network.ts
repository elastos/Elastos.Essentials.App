import { EVMNetwork } from "../evm.network";
import { BscAPI, BscApiType } from "./bsc.api";

export class BSCNetwork extends EVMNetwork {
  constructor() {
    super(
      "bsc",
      "BSC",
      "assets/wallet/networks/bscchain.png",
      "BNB",
      "Binance Coin",
      BscAPI.getApiUrl(BscApiType.RPC),
      BscAPI.getApiUrl(BscApiType.ACCOUNT_RPC),
      {
        "MainNet": {
          chainID: 56,
          builtInCoins: [
          ]
        },
        "TestNet": {
          chainID: 97
        }
      }
    );
  }
}
