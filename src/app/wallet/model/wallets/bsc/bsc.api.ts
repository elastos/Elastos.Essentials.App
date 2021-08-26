import { GlobalNetworksService, MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum BscApiType {
  RPC
}

// https://docs.binance.org/smart-chain/developer/rpc.html
export class BscAPI {
  public static getApiUrl(type: BscApiType): string {
    let networkTemplate = GlobalNetworksService.instance.activeNetworkTemplate.value;
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case BscApiType.RPC: return 'https://bsc-dataseed.binance.org/';
          //case HecoApiType.BROWSER_RPC: return 'https://scan.hecochain.com';
          //case HecoApiType.ACCOUNT_RPC: return 'https://api.hecoinfo.com';
          default:
            throw new Error("Bsc API - Unknown api type "+type);
        }
      /* case TESTNET_TEMPLATE:
        switch (type) {
          case HecoApiType.RPC: return 'https://http-testnet.hecochain.com';
          case HecoApiType.BROWSER_RPC: return 'https://testnet.hecoinfo.com';
          case HecoApiType.ACCOUNT_RPC: return 'https://api-testnet.hecoinfo.com';
          default:
            throw new Error("Heco API - Unknown api type "+type);
        } */
      default:
        throw new Error("Bsc API not supported for network template "+networkTemplate);
    }
  }
}