import { GlobalNetworksService, MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum BscApiType {
  ACCOUNT_RPC,
  RPC
}

// https://docs.binance.org/smart-chain/developer/rpc.html
export class BscAPI {
  public static getApiUrl(type: BscApiType): string {
    let networkTemplate = GlobalNetworksService.instance.activeNetworkTemplate.value;
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case BscApiType.RPC: return 'https://bsc-dataseed.binance.org';
          //case BscApiType.BROWSER_RPC: return 'https://bscscan.com';
          case BscApiType.ACCOUNT_RPC: return 'https://api.bscscan.com';
          default:
            throw new Error("Bsc API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case BscApiType.RPC: return 'https://data-seed-prebsc-1-s1.binance.org:8545';
          // case BscApiType.BROWSER_RPC: return 'https://testnet.bscscan.com';
          case BscApiType.ACCOUNT_RPC: return 'https://api-testnet.bscscan.com';
          default:
            throw new Error("Bsc API - Unknown api type " + type);
        }
      default:
        throw new Error("Bsc API not supported for network template " + networkTemplate);
    }
  }
}