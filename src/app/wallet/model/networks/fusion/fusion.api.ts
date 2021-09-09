import { Logger } from "src/app/logger";
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
          case FusionApiType.RPC: return 'https://mainnet.anyswap.exchange';
          default:
            throw new Error("Fusion API - Unknown api type " + type);
        }
      default:
        Logger.log("wallet", "Fusion API not supported for network template " + networkTemplate);
        return null;
    }
  }
}