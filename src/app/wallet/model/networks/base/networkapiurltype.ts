export enum NetworkAPIURLType {
  RPC, // Standard RPC node url for all chains
  COVALENTHQ, // Covalent url, for EVM networks mostly
  ETHERSCAN, // Etherscan block explorer API url, in case one is available on the network
  BLOCK_EXPLORER
}