import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum KavaApiType {
  RPC,
  ETHERSCAN_API,
  BLOCK_EXPLORER
}

export class KavaAPI {
  public static getApiUrl(type: KavaApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case KavaApiType.RPC: return 'https://evm.kava.io';
          case KavaApiType.ETHERSCAN_API: return 'https://explorer.kava.io/api';
          case KavaApiType.BLOCK_EXPLORER: return 'https://explorer.kava.io';
          default:
            throw new Error("Kava API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case KavaApiType.RPC: return 'https://evm.testnet.kava.io';
          case KavaApiType.ETHERSCAN_API: return 'https://explorer.testnet.kava.io/api';
          case KavaApiType.BLOCK_EXPLORER: return 'https://explorer.testnet.kava.io';
          default:
            throw new Error("Kava API - Unknown api type " + type);
        }
      default:
        throw new Error("Kava API not supported for network template " + networkTemplate);
    }
  }
}