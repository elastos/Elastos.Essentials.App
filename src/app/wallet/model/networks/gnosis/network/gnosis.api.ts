import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum GnosisApiType {
  RPC,
  ETHERSCAN_API,
  BLOCK_EXPLORER
}

export class GnosisAPI {
  public static getApiUrl(type: GnosisApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          // case GnosisApiType.RPC: return 'https://blockscout.com/xdai/mainnet/api/eth-rpc';
          case GnosisApiType.RPC: return 'https://rpc.gnosischain.com';
          case GnosisApiType.ETHERSCAN_API: return 'https://blockscout.com/xdai/mainnet/api';
          case GnosisApiType.BLOCK_EXPLORER: return 'https://blockscout.com/xdai/mainnet';
          default:
            throw new Error("Gnosis API - Unknown api type " + type);
        }
      default:
        throw new Error("Gnosis API not supported for network template " + networkTemplate);
    }
  }
}