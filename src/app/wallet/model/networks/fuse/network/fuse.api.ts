import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum FuseApiType {
  RPC,
  ETHERSCAN_API,
  BLOCK_EXPLORER
}

export class FuseAPI {
  public static getApiUrl(type: FuseApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case FuseApiType.RPC: return 'https://rpc.fuse.io';
          case FuseApiType.ETHERSCAN_API: return 'https://explorer.fuse.io/api';
          case FuseApiType.BLOCK_EXPLORER: return 'https://explorer.fuse.io';
          default:
            throw new Error("Fuse API - Unknown api type " + type);
        }
      default:
        throw new Error("Fuse API not supported for network template " + networkTemplate);
    }
  }
}