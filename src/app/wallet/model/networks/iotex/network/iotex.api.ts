import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum IoTeXApiType {
  RPC, // Native EVM api
  gRPC, // Additional gRPC API service specific to IoTeX, used by the iotex-antenna SDK
  BLOCK_EXPLORER
}

export class IoTeXAPI {
  public static getApiUrl(type: IoTeXApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case IoTeXApiType.RPC: return 'https://babel-api.mainnet.iotex.io';
          case IoTeXApiType.gRPC: return 'https://api.iotex.one';
          case IoTeXApiType.BLOCK_EXPLORER: return 'https://iotexscan.io';
          default:
            throw new Error("IoTeX API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case IoTeXApiType.RPC: return 'https://babel-api.testnet.iotex.io';
          case IoTeXApiType.gRPC: return 'https://api.testnet.iotex.one';
          case IoTeXApiType.BLOCK_EXPLORER: return 'https://testnet.iotexscan.io';
          default:
            throw new Error("IoTeX API - Unknown api type " + type);
        }
      default:
        throw new Error("IoTeX API not supported for network template " + networkTemplate);
    }
  }
}