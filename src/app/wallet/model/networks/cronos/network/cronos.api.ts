import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum CronosApiType {
  RPC,
  ETHERSCAN_API
}

export class CronosAPI {
  public static getApiUrl(type: CronosApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case CronosApiType.RPC: return 'https://evm.cronos.org';
          case CronosApiType.ETHERSCAN_API: return 'https://cronos.org/explorer/api';
          default:
            throw new Error("Cronos API - Unknown api type " + type);
        }
      default:
        throw new Error("Cronos API not supported for network template " + networkTemplate);
    }
  }
}