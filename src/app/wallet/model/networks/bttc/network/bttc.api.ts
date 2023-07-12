import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum BttcApiType {
  ETHERSCAN_API,
  RPC,
  BLOCK_EXPLORER
}


export class BttcApi {
  public static getApiUrl(type: BttcApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case BttcApiType.RPC: return 'https://rpc.bt.io';
          case BttcApiType.ETHERSCAN_API: return 'https://api.bttcscan.com/api';
          case BttcApiType.BLOCK_EXPLORER: return 'https://bttcscan.com';
          default:
            throw new Error("Bttc API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case BttcApiType.RPC: return 'https://pre-rpc.bt.io';
          case BttcApiType.ETHERSCAN_API: return 'https://api-testnet.bttcscan.com/api';
          case BttcApiType.BLOCK_EXPLORER: return 'https://testnet.bttcscan.com';
          default:
            throw new Error("Bttc API - Unknown api type " + type);
        }
      default:
        throw new Error("Bttc API not supported for network template " + networkTemplate);
    }
  }
}