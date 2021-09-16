import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum BscApiType {
  EXPLORER,
  RPC
}

// https://docs.binance.org/smart-chain/developer/rpc.html
export class BscAPI {
  public static getApiUrl(type: BscApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case BscApiType.RPC: return 'https://bsc-dataseed.binance.org';
          case BscApiType.EXPLORER: return 'https://api.bscscan.com/api';
          default:
            throw new Error("Bsc API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case BscApiType.RPC: return 'https://data-seed-prebsc-1-s1.binance.org:8545';
          case BscApiType.EXPLORER: return 'https://api-testnet.bscscan.com/api';
          default:
            throw new Error("Bsc API - Unknown api type " + type);
        }
      default:
        throw new Error("Bsc API not supported for network template " + networkTemplate);
    }
  }
}