import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { EthereumAPI, EthereumAPIType } from "./ethereum.api";
import { EthereumBaseNetwork } from "./ethereum.base.network";

// https://rpc.info/#ethereum-rpc
export class EthereumGoerliNetwork extends EthereumBaseNetwork {
  constructor() {
    super(
      "ethereum",
      "Ethereum Goerli",
      "Goerli",
      "assets/wallet/networks/ethereum.png",
      "ETH",
      "ETH",
      TESTNET_TEMPLATE,
      5,
    );

    this.averageBlocktime = 15;
  }

  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC)
      return EthereumAPI.getApiUrl(EthereumAPIType.RPC, "goerli");
    else if (type === NetworkAPIURLType.ETHERSCAN)
      return EthereumAPI.getApiUrl(EthereumAPIType.ETHERSCAN_API, "goerli");
    else if (type === NetworkAPIURLType.BLOCK_EXPLORER)
      return EthereumAPI.getApiUrl(EthereumAPIType.BLOCK_EXPLORER, "goerli");
    else
      throw new Error(`EthereumGoerliNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }
}
