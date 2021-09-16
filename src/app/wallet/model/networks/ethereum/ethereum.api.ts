
export enum EthereumAPIType {
  EXPLORER,
  RPC
}

export class EthereumAPI {
  public static getApiUrl(type: EthereumAPIType, networkIdentifier: 'mainnet' | 'ropsten'): string {
    switch (networkIdentifier) {
      case "mainnet":
        switch (type) {
          case EthereumAPIType.RPC: return 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';
          case EthereumAPIType.EXPLORER: return 'https://api.etherscan.io/api';
          default:
            throw new Error("Ethereum API - Unknown api type " + type);
        }
      case "ropsten":
        switch (type) {
          case EthereumAPIType.RPC: return 'https://ropsten.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';
          case EthereumAPIType.EXPLORER: return 'https://api-ropsten.etherscan.io/api';
          default:
            throw new Error("Ethereum API - Unknown api type " + type);
        }
      default:
        throw new Error("Ethereum API not supported for network identifier " + networkIdentifier);
    }
  }
}