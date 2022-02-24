import { SPVNetworkConfig } from "../../../../../services/wallet.service";
import { ERC20Coin } from "../../../../coin";
import { ElastosMainChainNetworkBase } from "../../mainchain/network/elastos.networks";

export class ElastosLRWNetwork extends ElastosMainChainNetworkBase {
  constructor() {
    super("elastos", "ElastosLRW", "assets/wallet/networks/elastos.svg", "LRW");
  }

  public getBuiltInERC20Coins(): ERC20Coin[] {
    return [];
  }

  public getMainChainID(): number {
    return -1; // No ETHSC on LRW
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig) {
    onGoingConfig['ELA'] = {
      "ChainParameters": {
        "MagicNumber": 20200501,
        "StandardPort": 40008,
        "DNSSeeds": ["longrunweather.com"],
        "CheckPoints": [[0, "d8d33c8a0a632ecc418bd7f09cd315dfc46a7e3e98e48c50c70a253e6062c257", 1513936800, 486801407]]
      }
    };
    onGoingConfig["IDChain"] = {
      "ChainParameters": {
        "MagicNumber": 20200503,
        "StandardPort": 41008,
        "DNSSeeds": ["longrunweather.com"],
        "CheckPoints": [[0, "56be936978c261b2e649d58dbfaf3f23d4a868274f5522cd2adb4308a955c4a3", 1530360000, 486801407]]
      }
    };
    onGoingConfig['ETHDID'] = { ChainID: 24, NetworkID: 24 };
  }
}