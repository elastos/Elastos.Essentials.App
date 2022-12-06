import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum EvmosApiType {
  RPC,
  ETHERSCAN_API,
  BLOCK_EXPLORER
}

export class EvmosAPI {
  public static getApiUrl(type: EvmosApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case EvmosApiType.RPC: return 'https://eth.bd.evmos.org:8545';
          case EvmosApiType.ETHERSCAN_API: return 'https://evm.evmos.org/api';
          case EvmosApiType.BLOCK_EXPLORER: return 'https://evm.evmos.org';
          default:
            throw new Error("Evmos API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case EvmosApiType.RPC: return 'https://eth.bd.evmos.dev:8545';
          case EvmosApiType.ETHERSCAN_API: return 'https://evm.evmos.dev/api';
          case EvmosApiType.BLOCK_EXPLORER: return 'https://evm.evmos.dev';
          default:
            throw new Error("Evmos API - Unknown api type " + type);
        }
      default:
        throw new Error("Evmos API not supported for network template " + networkTemplate);
    }
  }
}