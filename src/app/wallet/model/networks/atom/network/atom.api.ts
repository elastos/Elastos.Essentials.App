import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum AtomApiType {
  ETHERSCAN_API,
  RPC,
  BLOCK_EXPLORER
}

// https://docs.binance.org/smart-chain/developer/rpc.html
export class AtomAPI {
  public static getApiUrl(type: AtomApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case AtomApiType.RPC: return 'http://rpc-cosmoshub.freshstaking.com:26657';
        //   case AtomApiType.ETHERSCAN_API: return 'https://api.bscscan.com/api';
          case AtomApiType.BLOCK_EXPLORER: return 'https://atomscan.com';
          default:
            throw new Error("Atom API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case AtomApiType.RPC: return 'https://rpc.sentry-02.theta-testnet.polypore.xyz';
        //   case AtomApiType.ETHERSCAN_API: return 'https://api-testnet.bscscan.com/api';
          case AtomApiType.BLOCK_EXPLORER: return 'https://explorer.theta-testnet.polypore.xyz';
          default:
            throw new Error("Atom API - Unknown api type " + type);
        }
      default:
        throw new Error("Atom API not supported for network template " + networkTemplate);
    }
  }
}