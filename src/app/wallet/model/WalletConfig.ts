import { Logger } from "src/app/logger";
import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export class WalletConfig {
  private static mainNet = {
    'ELA': {},
    'IDChain': {},
    'ETHSC': {'ChainID': 20, 'NetworkID': 20},
    'ETHDID': {'ChainID': 22, 'NetworkID': 22},
  }

  private static testNet = {
    'ELA': {},
    'IDChain': {},
    'ETHSC': {'ChainID': 21, 'NetworkID': 21},
    'ETHDID': {'ChainID': 23, 'NetworkID': 23},
    'ETHHECO': {'ChainID': 256, 'NetworkID': 256},
  }

  private static LrwNet = {
    'ELA': {
      "ChainParameters":{
        "MagicNumber":20200501,
        "StandardPort":40008,
        "DNSSeeds":["longrunweather.com"],
        "CheckPoints":[[0,"d8d33c8a0a632ecc418bd7f09cd315dfc46a7e3e98e48c50c70a253e6062c257",1513936800,486801407]]
      }
    },
    "IDChain":{
      "ChainParameters":{
        "MagicNumber":20200503,
        "StandardPort":41008,
        "DNSSeeds":["longrunweather.com"],
        "CheckPoints":[[0,"56be936978c261b2e649d58dbfaf3f23d4a868274f5522cd2adb4308a955c4a3",1530360000,486801407]]
      }
    },
    'ETHDID': {'ChainID': 24, 'NetworkID': 24}
  }

  public static getNetConfig(networkTemplate: string) {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        return WalletConfig.mainNet;
      break;
      case TESTNET_TEMPLATE:
        return WalletConfig.testNet;
      break;
      case 'LRW':
        return WalletConfig.LrwNet;
      break;
      default:
        Logger.warn('wallet', 'WalletConfig: Not support ', networkTemplate)
      break;
    }
  }
}
