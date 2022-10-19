import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum HooApiType {
  RPC,
  ETHERSCAN_API,
  BLOCK_EXPLORER
}

export class HooAPI {
  public static getApiUrl(type: HooApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case HooApiType.RPC: return 'https://http-mainnet.hoosmartchain.com';
          case HooApiType.ETHERSCAN_API: return 'https://hooscan.com/api';
          case HooApiType.BLOCK_EXPLORER: return 'https://hooscan.com';
          default:
            throw new Error("Hoo API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case HooApiType.RPC: return 'https://http-testnet.hoosmartchain.com';
          case HooApiType.ETHERSCAN_API: return 'TODO';
          case HooApiType.BLOCK_EXPLORER: return 'https://testnet.hooscan.com';
          default:
            throw new Error("Hoo API - Unknown api type " + type);
        }
      default:
        throw new Error("Hoo API not supported for network template " + networkTemplate);
    }
  }
}