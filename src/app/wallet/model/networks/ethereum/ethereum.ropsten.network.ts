import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { EVMNetwork } from "../evms/evm.network";
import { EthereumAPI, EthereumAPIType } from "./ethereum.api";

// https://rpc.info/#ethereum-rpc
export class EthereumRopstenNetwork extends EVMNetwork {
  constructor() {
    super(
      "ethereum",
      "Ethereum Ropsten",
      "assets/wallet/networks/ethereum.png",
      "ETH",
      "ETH",
      EthereumAPI.getApiUrl(EthereumAPIType.RPC, "ropsten"),
      EthereumAPI.getApiUrl(EthereumAPIType.EXPLORER, "ropsten"),
      TESTNET_TEMPLATE,
      3,
    );

    this.averageBlocktime = 15;
  }
}
