import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum TelosAPIType {
  RPC,
  TELOS_EXPLORER_API
}

// Block explorer: https://rpc1.us.telos.net/v2/explore
// Testnet faucet: https://app.telos.net/testnet/developers
// Testnet explorer: http://testnet.telos.net/v2/explore/
// Some API: http://rpc1.us.telos.net/v2/docs/static/index.html#/evm/get_evm_explorer_get_transactions
// Get transactions: https://rpc1.us.telos.net/evm_explorer/get_transactions?address=0xbA1ddcB94B3F8FE5d1C0b2623cF221e099f485d1
export class TelosAPI {
  public static getApiUrl(type: TelosAPIType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case TelosAPIType.RPC: return 'https://mainnet.telos.net/evm';
          case TelosAPIType.TELOS_EXPLORER_API: return 'https://rpc1.us.telos.net';
          default:
            throw new Error("Telos API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case TelosAPIType.RPC: return 'https://testnet.telos.net/evm';
          //case TelosAPIType.ACCOUNT_RPC: return 'NOT_SUPPORTED_YET';
          default:
            throw new Error("Telos API - Unknown api type " + type);
        }
      default:
        throw new Error("Telos API not supported for network template " + networkTemplate);
    }
  }
}