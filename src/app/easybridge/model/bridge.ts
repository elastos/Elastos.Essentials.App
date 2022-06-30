export type ChainInfo = {
  contract: string; // eg: '0xf127003ea39878EFeEE89aA4E22248CC6cb7728E'
  fee: number; // eg: 0
}

export type Bridge = {
  native: {
    [chainId: string]: ChainInfo
  },
  token: {
    [chainId: string]: ChainInfo
  }
}