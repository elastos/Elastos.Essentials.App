import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum BaseChainApiType {
  RPC,
  ETHERSCAN_API,
  BLOCK_EXPLORER
}

/**
 * Base (Coinbase L2, chainId 8453) API endpoints.
 * Transaction history uses Blockscout's free, public, Etherscan-compatible API
 * (no API key required), so tx history works without a paid Etherscan v2 key.
 * Mainnet only for the first pass.
 */
export class BaseChainAPI {
  public static getApiUrl(type: BaseChainApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case BaseChainApiType.RPC: return 'https://mainnet.base.org';
          case BaseChainApiType.ETHERSCAN_API: return 'https://base.blockscout.com/api';
          case BaseChainApiType.BLOCK_EXPLORER: return 'https://basescan.org';
          default:
            throw new Error("Base API - Unknown api type " + type);
        }
      default:
        throw new Error("Base API not supported for network template " + networkTemplate);
    }
  }
}
