import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum FantomApiType {
  RPC,
  BROWSER_RPC,
  ACCOUNT_RPC
}

export class FantomAPI {
  public static getApiUrl(type: FantomApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case FantomApiType.RPC: return 'https://rpcapi.fantom.network';
          case FantomApiType.BROWSER_RPC: return 'https://ftmscan.com';
          case FantomApiType.ACCOUNT_RPC: return 'https://api.ftmscan.com/api';
          default:
            throw new Error("Fantom API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case FantomApiType.RPC: return 'https://rpc.testnet.fantom.network';
          case FantomApiType.BROWSER_RPC: return 'https://testnet.ftmscan.com';
          case FantomApiType.ACCOUNT_RPC: return 'https://api-testnet.ftmscan.com/api';
          default:
            throw new Error("Fantom API - Unknown api type " + type);
        }
      default:
        throw new Error("Fantom API not supported for network template " + networkTemplate);
    }
  }
}