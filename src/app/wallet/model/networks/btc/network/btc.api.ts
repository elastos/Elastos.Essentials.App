import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum BTCApiType {
  NODE,
  EXPLORER,
}

export class BTCAPI {
  public static getApiUrl(type: BTCApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
        //   case BTCApiType.NODE: return 'https://btc.nownodes.io';
          case BTCApiType.NODE: return 'https://btcbook.nownodes.io';
          //case BTCApiType.EXPLORER: return 'https://btcbook.nownodes.io';
          default:
            throw new Error("BTC API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case BTCApiType.NODE: return 'https://btc-testnet.nownodes.io';
          //case BTCApiType.EXPLORER: return 'https://btcbook-testnet.nownodes.io';
          default:
            throw new Error("BTC API - Unknown api type " + type);
        }
      default:
        throw new Error("BTC API not supported for network template " + networkTemplate);
    }
  }
}