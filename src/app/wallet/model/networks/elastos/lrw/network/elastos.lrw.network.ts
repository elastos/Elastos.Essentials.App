import { ConfigInfo } from "@elastosfoundation/wallet-js-sdk/typings/config";
import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { ERC20Coin, StandardCoinName } from "../../../../coin";
import { NetworkAPIURLType } from "../../../base/networkapiurltype";
import { ElastosMainChainNetworkBase } from "../../mainchain/network/elastos.networks";

export class ElastosLRWNetwork extends ElastosMainChainNetworkBase {
  constructor() {
    super("elastos", "ElastosLRW", "ElastosLRW", "assets/wallet/networks/elastos.svg", "LRW");
  }

  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC)
      return GlobalElastosAPIService.instance.getApiUrl(GlobalElastosAPIService.instance.getApiUrlTypeForRpc(StandardCoinName.ELA), "LRW");
    else
      return null;
  }

  public getBuiltInERC20Coins(): ERC20Coin[] {
    return [];
  }

  public getMainChainID(): number {
    return -1; // No ETHSC on LRW
  }

  public updateSPVNetworkConfig(onGoingConfig: ConfigInfo) {
    onGoingConfig['ELA'] = {
    };
    onGoingConfig["IDChain"] = {
    };
    onGoingConfig['ETHDID'] = { chainID: '24', NetworkID: '24' };
  }
}