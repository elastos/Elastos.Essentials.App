import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum CeloApiType {
  ETHERSCAN_API,
  RPC,
  BLOCK_EXPLORER
}


export class CeloAPI {
  public static getApiUrl(type: CeloApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case CeloApiType.RPC: return 'https://forno.celo.org';
          case CeloApiType.ETHERSCAN_API: return 'https://celoscan.io/api';
          case CeloApiType.BLOCK_EXPLORER: return 'https://celoscan.io';
          default:
            throw new Error("Celo API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case CeloApiType.RPC: return 'https://alfajores-forno.celo-testnet.org';
          case CeloApiType.ETHERSCAN_API: return 'https://alfajores.celoscan.io/api';
          case CeloApiType.BLOCK_EXPLORER: return 'https://alfajores.celoscan.io';
          default:
            throw new Error("Celo API - Unknown api type " + type);
        }
      default:
        throw new Error("Celo API not supported for network template " + networkTemplate);
    }
  }
}