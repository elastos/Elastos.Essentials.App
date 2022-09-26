import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { EthereumAPI, EthereumAPIType } from "./ethereum.api";
import { EthereumBaseNetwork } from "./ethereum.base.network";

// https://rpc.info/#ethereum-rpc
export class EthereumRopstenNetwork extends EthereumBaseNetwork {
  constructor() {
    super(
      "ethereum",
      "Ethereum Ropsten",
      "Ropsten",
      "assets/wallet/networks/ethereum.png",
      "ETH",
      "ETH",
      TESTNET_TEMPLATE,
      3,
    );

    this.averageBlocktime = 15;
  }

  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC)
      return EthereumAPI.getApiUrl(EthereumAPIType.RPC, "ropsten");
    else if (type === NetworkAPIURLType.ETHERSCAN)
      return EthereumAPI.getApiUrl(EthereumAPIType.ETHERSCAN_API, "ropsten");
    else
      throw new Error(`EthereumRopstenNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }
}
