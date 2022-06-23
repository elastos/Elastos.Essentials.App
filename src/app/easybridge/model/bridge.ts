export type ChainInfo = {
  contract: string; // eg: '0xf127003ea39878EFeEE89aA4E22248CC6cb7728E'
  minTx: number; // min tokens for a transfer, readable format - eg: 1
  maxTx: number; // min tokens for a transfer, readable format - eg: 1500000 - equivalent to contract 1500000000000000000000000
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