import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum FusionApiType {
  RPC,
  FSNSCAN_API
}

export class FusionAPI {
  public static getApiUrl(type: FusionApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case FusionApiType.RPC: return 'https://mainnet.anyswap.exchange';
          case FusionApiType.FSNSCAN_API: return 'https://api.fsnscan.com'
          default:
            throw new Error("Fusion API - Unknown api type " + type);
        }
      default:
        throw new Error("Fusion API not supported for network template " + networkTemplate);
    }
  }
}