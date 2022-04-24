import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum AvalancheCChainApiType {
  RPC
}

export class AvalancheCChainAPI {
  public static getApiUrl(type: AvalancheCChainApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case AvalancheCChainApiType.RPC: return 'https://api.avax.network/ext/bc/C/rpc';
          default:
            throw new Error("AvalancheCChain API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case AvalancheCChainApiType.RPC: return 'https://api.avax-test.network/ext/bc/C/rpc';
          default:
            throw new Error("AvalancheCChain API - Unknown api type " + type);
        }
      default:
        throw new Error("AvalancheCChain API not supported for network template " + networkTemplate);
    }
  }
}