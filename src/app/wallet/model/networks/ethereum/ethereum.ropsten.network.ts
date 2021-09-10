import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { EVMNetwork } from "../evm.network";
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
      EthereumAPI.getApiUrl(EthereumAPIType.ACCOUNT_RPC, "ropsten"),
      TESTNET_TEMPLATE,
      3
    );
  }
}
