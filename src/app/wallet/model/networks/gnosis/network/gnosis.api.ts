import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum GnosisApiType {
  RPC,
  ETHERSCAN_API
}

export class GnosisAPI {
  public static getApiUrl(type: GnosisApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case GnosisApiType.RPC: return 'https://dai.poa.network';
          case GnosisApiType.ETHERSCAN_API: return 'https://blockscout.com/xdai/mainnet/api';
          default:
            throw new Error("Gnosis API - Unknown api type " + type);
        }
      default:
        throw new Error("Gnosis API not supported for network template " + networkTemplate);
    }
  }
}