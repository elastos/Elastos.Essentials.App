import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum TronApiType {
  RPC,
  BLOCK_EXPLORER,
}

export class TronAPI {
  public static getApiUrl(type: TronApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case TronApiType.RPC: return 'https://api.trongrid.io';
          case TronApiType.BLOCK_EXPLORER: return 'https://tronscan.io'
          default:
            throw new Error("TRON API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case TronApiType.RPC: return 'https://api.shasta.trongrid.io';
          case TronApiType.BLOCK_EXPLORER: return 'https://shasta.tronscan.org'
          default:
            throw new Error("TRON API - Unknown api type " + type);
        }
      default:
        throw new Error("TRON API not supported for network template " + networkTemplate);
    }
  }
}