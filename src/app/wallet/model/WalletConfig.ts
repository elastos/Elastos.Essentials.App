import { Logger } from "src/app/logger";

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
    'ELA': {},
    'IDChain': {},
    'ETHDID': {'ChainID': 24, 'NetworkID': 24},
  }

  public static getNetConfig(netType) {
    switch (netType) {
      case 'MainNet':
        return JSON.stringify(WalletConfig.mainNet);
      break;
      case 'TestNet':
        return JSON.stringify(WalletConfig.testNet);
      break;
      case 'LrwNet':
        return JSON.stringify(WalletConfig.LrwNet);
      break;
      default:
        Logger.warn('wallet', 'WalletConfig: Not support ', netType)
      break;
    }
  }
}
