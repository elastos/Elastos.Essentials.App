import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum FantomApiType {
  RPC,
  ETHERSCAN_API
}

export class FantomAPI {
  public static getApiUrl(type: FantomApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case FantomApiType.RPC: return 'https://rpcapi.fantom.network';
          case FantomApiType.ETHERSCAN_API: return 'https://api.ftmscan.com/api';
          default:
            throw new Error("Fantom API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case FantomApiType.RPC: return 'https://rpc.testnet.fantom.network';
          case FantomApiType.ETHERSCAN_API: return 'https://api-testnet.ftmscan.com/api';
          default:
            throw new Error("Fantom API - Unknown api type " + type);
        }
      default:
        throw new Error("Fantom API not supported for network template " + networkTemplate);
    }
  }
}