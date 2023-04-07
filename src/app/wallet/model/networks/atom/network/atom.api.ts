import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";

export enum AtomApiType {
  RPC,
  BLOCK_EXPLORER
}

// https://cosmos.directory/cosmoshub
export class AtomAPI {
  public static getApiUrl(type: AtomApiType, networkTemplate: string): string {
    switch (networkTemplate) {
      case MAINNET_TEMPLATE:
        switch (type) {
          case AtomApiType.RPC: return 'https://rpc.cosmos.directory/cosmoshub';
          case AtomApiType.BLOCK_EXPLORER: return 'https://atomscan.com';
          default:
            throw new Error("Atom API - Unknown api type " + type);
        }
      case TESTNET_TEMPLATE:
        switch (type) {
          case AtomApiType.RPC: return 'https://rpc.sentry-02.theta-testnet.polypore.xyz';
          case AtomApiType.BLOCK_EXPLORER: return 'https://explorer.theta-testnet.polypore.xyz';
          default:
            throw new Error("Atom API - Unknown api type " + type);
        }
      default:
        throw new Error("Atom API not supported for network template " + networkTemplate);
    }
  }
}