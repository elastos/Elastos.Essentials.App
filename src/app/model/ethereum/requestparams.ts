/**
 * Types for web3 request parameters.
 */

// wallet_addEthereumChain
export type AddEthereumChainParameter = {
  chainId: string; // A 0x-prefixed hexadecimal string
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string; // 2-6 characters long
    decimals: 18;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
  iconUrls?: string[]; // Currently ignored.
}

// wallet_switchEthereumChain
export type SwitchEthereumChainParameter = {
  chainId: string; // A 0x-prefixed hexadecimal string
}