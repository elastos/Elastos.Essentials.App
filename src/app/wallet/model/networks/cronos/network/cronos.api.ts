import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum CronosApiType {
  RPC,
  ETHERSCAN_API,
  BLOCK_EXPLORER
}

export class CronosAPI {
  public static getApiUrl(type: CronosApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case CronosApiType.RPC: return 'https://evm.cronos.org';
          case CronosApiType.ETHERSCAN_API: return 'https://cronos.org/explorer/api';
          case CronosApiType.BLOCK_EXPLORER: return 'https://cronoscan.com/';
          default:
            throw new Error("Cronos API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
            case CronosApiType.RPC: return 'https://evm-t3.cronos.org';
            case CronosApiType.ETHERSCAN_API: return 'https://api-testnet.cronoscan.com/api';
            case CronosApiType.BLOCK_EXPLORER: return 'https://testnet.cronoscan.com/';
            default:
            throw new Error("Cronos API - Unknown api type " + type);
        }
      default:
        throw new Error("Cronos API not supported for network template " + networkTemplate);
    }
  }
}