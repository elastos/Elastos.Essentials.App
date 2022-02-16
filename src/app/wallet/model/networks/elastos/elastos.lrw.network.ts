import { SPVNetworkConfig } from "../../../services/wallet.service";
import { ERC20Coin } from "../../coin";
import { ElastosMainChainNetworkWallet } from "../../wallets/elastos/networkwallets/mainchain.networkwallet";
import { MasterWallet } from "../../wallets/masterwallet";
import { NetworkWallet } from "../../wallets/networkwallet";
import { ElastosNetworkBase } from "./elastos.base.network";

export class ElastosLRWNetwork extends ElastosNetworkBase {
  constructor() {
    super("elastos", "ElastosLRW", "LRW");
  }

  public createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<NetworkWallet> {
    let wallet = new ElastosMainChainNetworkWallet(masterWallet, this);
    return this.initCreatedNetworkWallet(wallet, startBackgroundUpdates);
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