export type BridgeableToken = {
  name: string; // eg: "ETH on Elastos"
  symbol: string; // eg: "ETH"
  address: string; // eg: "0x802c3e839E4fDb10aF583E3E759239ec7703501e"
  chainId: number; // eg: 20
  decimals: number; // eg: 18
  origin?: number; // eg: 1
  isNative?: boolean; // Whether this is a native coin or a ERC20 token
  isWrappedNative?: boolean; // Whether this is the wrapped version of a native coin on the origin chain (eg: BNB on Elastos is true)
  minTx?: number; // eg: 1
  fee?: number; // eg: 2,
  wrappedAddresses?: { // List of contract addresses of the wrapped version of this token on other chains
    [chainId: number]: string
  }
}