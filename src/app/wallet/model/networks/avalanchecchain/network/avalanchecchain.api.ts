import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum AvalancheCChainApiType {
  RPC,
  ETHERSCAN_API,
  BLOCK_EXPLORER
}

export class AvalancheCChainAPI {
  public static getApiUrl(type: AvalancheCChainApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case AvalancheCChainApiType.RPC: return 'https://api.avax.network/ext/bc/C/rpc';
          case AvalancheCChainApiType.ETHERSCAN_API: return 'https://api.etherscan.io/v2/api';
          case AvalancheCChainApiType.BLOCK_EXPLORER: return 'https://snowtrace.io';
          default:
            throw new Error("AvalancheCChain API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case AvalancheCChainApiType.RPC: return 'https://api.avax-test.network/ext/bc/C/rpc';
          case AvalancheCChainApiType.BLOCK_EXPLORER: return 'https://testnet.snowtrace.io/';
          default:
            throw new Error("AvalancheCChain API - Unknown api type " + type);
        }
      default:
        throw new Error("AvalancheCChain API not supported for network template " + networkTemplate);
    }
  }
}