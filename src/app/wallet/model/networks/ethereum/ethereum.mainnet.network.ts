import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { EVMNetwork } from "../evm.network";
import { EthereumAPI, EthereumAPIType } from "./ethereum.api";

// https://rpc.info/#ethereum-rpc
export class EthereumMainNetNetwork extends EVMNetwork {
  constructor() {
    super(
      "ethereum",
      "ETH",
      "assets/wallet/networks/ethereum.png",
      "ETH",
      "ETH",
      EthereumAPI.getApiUrl(EthereumAPIType.RPC, "mainnet"),
      EthereumAPI.getApiUrl(EthereumAPIType.ACCOUNT_RPC, "mainnet"),
      MAINNET_TEMPLATE,
      1
    );
  }
}
