import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum HecoApiType {
  RPC,
  BROWSER_RPC,
  ACCOUNT_RPC
}

export class HecoAPI {
  public static getApiUrl(type: HecoApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case HecoApiType.RPC: return 'https://http-mainnet.hecochain.com';
          case HecoApiType.BROWSER_RPC: return 'https://scan.hecochain.com';
          case HecoApiType.ACCOUNT_RPC: return 'https://api.hecoinfo.com';
          default:
            throw new Error("Heco API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case HecoApiType.RPC: return 'https://http-testnet.hecochain.com';
          case HecoApiType.BROWSER_RPC: return 'https://testnet.hecoinfo.com';
          case HecoApiType.ACCOUNT_RPC: return 'https://api-testnet.hecoinfo.com';
          default:
            throw new Error("Heco API - Unknown api type " + type);
        }
      default:
        throw new Error("Heco API not supported for network template " + networkTemplate);
    }
  }
}