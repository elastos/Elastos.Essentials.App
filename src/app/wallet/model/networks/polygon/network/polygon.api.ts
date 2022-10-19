import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum PolygonAPIType {
  ETHERSCAN_API,
  RPC,
  BLOCK_EXPLORER
}

// https://docs.matic.network/docs/develop/network-details/network/
export class PolygonAPI {
  public static getApiUrl(type: PolygonAPIType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case PolygonAPIType.RPC: return 'https://polygon-rpc.com/';
          case PolygonAPIType.ETHERSCAN_API: return 'https://api.polygonscan.com/api';
          case PolygonAPIType.BLOCK_EXPLORER: return 'https://polygonscan.com';
          default:
            throw new Error("Polygon API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case PolygonAPIType.RPC: return 'https://rpc-mumbai.maticvigil.com/';
          case PolygonAPIType.ETHERSCAN_API: return 'https://api-testnet.polygonscan.com/api';
          case PolygonAPIType.BLOCK_EXPLORER: return 'https://mumbai.polygonscan.com/';
          default:
            throw new Error("Polygon API - Unknown api type " + type);
        }
      default:
        throw new Error("Polygon API not supported for network template " + networkTemplate);
    }
  }
}