
export enum EthereumAPIType {
  RPC,
  ETHERSCAN_API,
  BLOCK_EXPLORER
}

export class EthereumAPI {
  public static getApiUrl(type: EthereumAPIType, networkIdentifier: 'mainnet' | 'goerli'): string {
    switch (networkIdentifier) {
      case "mainnet":
        switch (type) {
          case EthereumAPIType.RPC: return 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';
          case EthereumAPIType.ETHERSCAN_API: return 'https://api.etherscan.io/api';
          case EthereumAPIType.BLOCK_EXPLORER: return 'https://etherscan.io';
          default:
            throw new Error("Ethereum API - Unknown api type " + type);
        }
      case "goerli":
        switch (type) {
          case EthereumAPIType.RPC: return 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';
          case EthereumAPIType.ETHERSCAN_API: return 'https://api-goerli.etherscan.io/api';
          case EthereumAPIType.BLOCK_EXPLORER: return 'https://goerli.etherscan.io';
          default:
            throw new Error("Ethereum API - Unknown api type " + type);
        }
      default:
        throw new Error("Ethereum API not supported for network identifier " + networkIdentifier);
    }
  }
}