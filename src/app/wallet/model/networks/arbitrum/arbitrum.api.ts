import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum ArbitrumApiType {
  RPC,
  ACCOUNT_RPC
}

export class ArbitrumAPI {
  public static getApiUrl(type: ArbitrumApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case ArbitrumApiType.RPC: return 'https://arb1.arbitrum.io/rpc';
          case ArbitrumApiType.ACCOUNT_RPC: return 'https://api.arbiscan.io';
          default:
            throw new Error("Arbitrum API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case ArbitrumApiType.RPC: return 'TODO';
          case ArbitrumApiType.ACCOUNT_RPC: return 'TODO';
          default:
            throw new Error("Arbitrum API - Unknown api type " + type);
        }
      default:
        throw new Error("Arbitrum API not supported for network template " + networkTemplate);
    }
  }
}