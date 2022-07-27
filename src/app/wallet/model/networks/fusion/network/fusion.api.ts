import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum FusionApiType {
  RPC,
  FSNSCAN_API
}

export class FusionAPI {
  public static getApiUrl(type: FusionApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          // case FusionApiType.RPC: return 'https://mainnet.anyswap.exchange';
          case FusionApiType.RPC: return 'https://mainnet.fusionnetwork.io';
          case FusionApiType.FSNSCAN_API: return 'https://api.fsnscan.com'
          default:
            throw new Error("Fusion API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case FusionApiType.RPC: return 'https://testnet.fusionnetwork.io';
          // TODO: the fsnscan api for testent is not ready.
          case FusionApiType.FSNSCAN_API: return 'https://testnetapi.fsnscan.com'
          default:
            throw new Error("Fusion API - Unknown api type " + type);
        }
      default:
        throw new Error("Fusion API not supported for network template " + networkTemplate);
    }
  }
}