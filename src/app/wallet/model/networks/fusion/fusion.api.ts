import { GlobalNetworksService, MAINNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum FusionApiType {
  RPC,
}

export class FusionAPI {
  public static getApiUrl(type: FusionApiType): string {
    let networkTemplate = GlobalNetworksService.instance.activeNetworkTemplate.value;
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case FusionApiType.RPC: return 'https://api.fusionnetwork.io';
          default:
            throw new Error("Fusion API - Unknown api type " + type);
        }
      default:
        throw new Error("Fusion API not supported for network template " + networkTemplate);
    }
  }
}