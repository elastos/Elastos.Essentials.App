import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum BscApiType {
  ETHERSCAN_API,
  RPC,
  BLOCK_EXPLORER
}

// https://docs.binance.org/smart-chain/developer/rpc.html
export class BscAPI {
  public static getApiUrl(type: BscApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case BscApiType.RPC: return 'https://bsc-dataseed1.defibit.io';
          case BscApiType.ETHERSCAN_API: return 'https://api.bscscan.com/api';
          case BscApiType.BLOCK_EXPLORER: return 'https://bscscan.com';
          default:
            throw new Error("Bsc API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case BscApiType.RPC: return 'https://data-seed-prebsc-1-s1.binance.org:8545';
          case BscApiType.ETHERSCAN_API: return 'https://api-testnet.bscscan.com/api';
          case BscApiType.BLOCK_EXPLORER: return 'https://testnet.bscscan.com';
          default:
            throw new Error("Bsc API - Unknown api type " + type);
        }
      default:
        throw new Error("Bsc API not supported for network template " + networkTemplate);
    }
  }
}