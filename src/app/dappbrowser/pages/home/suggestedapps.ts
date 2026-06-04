export type DAppMenuEntry = {
  icon: string;
  title: string;
  description: string;
  url: string;
  useExternalBrowser: boolean;
  walletConnectSupported: boolean; // Whether the dapp supports wallet connect or not (needed for external navigation on ios for instance - otherwise we don't recommend)
  networks: string[]; // List of network keys in which this dapp can run. Empty list = available everywhere.
};

export const suggestedDApps = (darkMode: boolean, lightweightMode = false): DAppMenuEntry[] => [
  {
    icon: '/assets/browser/dapps/pga.png',
    title: 'BTCD Stablecoin Minting',
    description: "The world's first fully Bitcoin-backed stablecoin. Put your Bitcoin to work without selling it.",
    url: 'https://newbtcd.pgachain.org/',
    useExternalBrowser: false,
    walletConnectSupported: false,
    networks: ['elastosecopgp']
  },
  {
    icon: '/assets/browser/dapps/pga.png',
    title: 'BTCD Stablecoin Minting',
    description: "The world's first fully Bitcoin-backed stablecoin. Put your Bitcoin to work without selling it.",
    url: 'https://ecobtcd.pgachain.org/',
    useExternalBrowser: false,
    walletConnectSupported: false,
    networks: ['elastoseco']
  },
  {
    icon: '/assets/browser/dapps/pgp.png',
    title: 'PGP Swap',
    description: '',
    url: 'https://swap.pgachain.org',
    useExternalBrowser: false,
    walletConnectSupported: false,
    networks: ['elastoseco', 'elastosecopgp']
  },
  {
    icon: '/assets/browser/dapps/pgp.png',
    title: 'PGA Miner',
    description: '',
    url: 'https://miner.pgachain.org',
    useExternalBrowser: false,
    walletConnectSupported: false,
    networks: ['elastoseco', 'elastosecopgp']
  },
  {
    icon: '/assets/browser/dapps/ela.svg',
    title: 'PGP Explorer',
    description: '',
    url: 'https://pgp.elastos.io/',
    useExternalBrowser: false,
    walletConnectSupported: false,
    networks: ['elastosecopgp']
  },
  {
    icon: '/assets/browser/dapps/ela.svg',
    title: 'PGP Explorer',
    description: '',
    url: 'https://eco.elastos.io/',
    useExternalBrowser: false,
    walletConnectSupported: false,
    networks: ['elastoseco']
  },
  {
    icon: '/assets/browser/dapps/ela.svg',
    title: 'Elastos Smart Chain (ESC) Blockchain Explorer',
    description: '',
    url: 'https://esc.elastos.io/',
    useExternalBrowser: false,
    walletConnectSupported: false,
    networks: ['elastossmartchain']
  },
  {
    icon: '/assets/browser/dapps/ela.svg',
    title: 'Elastos Mainchain Blockchain Explorer',
    description: '',
    url: 'https://ela.elastos.io/',
    useExternalBrowser: false,
    walletConnectSupported: false,
    networks: []
  },
  {
    icon: '/assets/browser/dapps/oklink.png',
    title: 'Bitcoin 区块链浏览器 | OKLink',
    description: '',
    url: 'https://www.oklink.com/zh-hans/bitcoin',
    useExternalBrowser: false,
    walletConnectSupported: false,
    networks: ['btc']
  },
  {
    icon: '/assets/browser/dapps/glidefinance.png',
    title: 'Glide Finance',
    description: 'Elastos ecosystem decentralized exchange',
    url: 'https://glidefinance.io/',
    useExternalBrowser: false,
    walletConnectSupported: true,
    networks: ['elastossmartchain']
  },
  {
    icon: '/assets/browser/dapps/elacity.png',
    title: 'Elacity',
    description: 'A community driven online marketplace',
    url: 'https://ela.city/',
    useExternalBrowser: false,
    walletConnectSupported: true,
    networks: ['elastossmartchain']
  },
  ...(!lightweightMode
    ? [
        {
          icon: '/assets/browser/dapps/elastosdao.svg',
          title: 'Elastos DAO',
          description: 'Elastos DAO (DAO) is the community that has naturally formed around Elastos.',
          url: 'https://elastos.com/',
          useExternalBrowser: false,
          walletConnectSupported: true, // Not really, but we can open on ios, as this is a non web3 dapps
          networks: [] // All networks
        }
      ]
    : []),
  // {
  //   icon: '/assets/browser/dapps/multichain.png',
  //   title: 'Multichain',
  //   description:
  //     'Cross-ChainRouter Protocol',
  //   url: 'https://multichain.org/',
  //   useExternalBrowser: false,
  //   walletConnectSupported: true,
  //   networks: ['arbitrum', 'avalanchecchain', 'bsc', 'eth', 'fusion', 'fantom', 'polygon', 'telos']
  // },
  {
    icon: '/assets/browser/dapps/elk.svg',
    title: 'ElkDex by ElkFinance',
    description:
      'Elk Finance is a decentralized network for cross-chain liquidity. Our motto is "Any chain, anytime, anywhere.™',
    url: 'https://app.elk.finance/',
    useExternalBrowser: false,
    walletConnectSupported: false,
    networks: ['elastossmartchain', 'bsc', 'avalanchecchain', 'fantom', 'polygon', 'telos']
  },
  {
    icon: '/assets/browser/dapps/filda.png',
    title: 'FilDA',
    description: 'Multi-assets lending and borrowing DeFi platform',
    url: 'https://app.filda.io/bank/',
    useExternalBrowser: false,
    walletConnectSupported: true,
    networks: ['bsc', 'elastossmartchain']
  },
  ...(!lightweightMode
    ? [
        {
          icon: '/assets/browser/dapps/kyc-me.png',
          title: 'Kyc-me',
          description: 'KYC service for W3C DID Verifiable Credentials on Elastos',
          url: 'https://kyc-me.io/',
          useExternalBrowser: false,
          walletConnectSupported: true,
          networks: [] // All networks
        }
      ]
    : []),
  {
    icon: '/assets/browser/dapps/tokbridge.svg',
    title: 'Shadow Tokens',
    description: 'Bridge assets between Elastos and other chains',
    url: 'https://tokbridge.net/',
    useExternalBrowser: false,
    walletConnectSupported: false, // Seems to be supported on the website but not working
    networks: ['elastossmartchain', 'bsc', 'ethereum']
  },
  {
    icon: '/assets/browser/dapps/sushiswap.png',
    title: 'Sushiswap',
    description: 'Be a DeFi Chef with Sushi. Swap, earn, stack yields, lend, borrow ...',
    url: 'https://app.sushi.com/',
    useExternalBrowser: false,
    walletConnectSupported: true,
    networks: ['ethereum', 'fantom', 'bsc', 'kava', 'polygon', 'telos']
  },
  // {
  //   icon: '/assets/browser/dapps/kava.svg',
  //   title: 'Kava',
  //   description: "Kava is the DeFi lending platform for the world's largest cryptocurrencies.",
  //   url: 'https://app.kava.io/',
  //   useExternalBrowser: false,
  //   walletConnectSupported: true,
  //   networks: ['kava']
  // },
  {
    icon: '/assets/browser/dapps/chainlist.svg',
    title: 'ChainList',
    description: 'Chainlist is a list of most EVM networks. Easily browse and add custom networks from there',
    url: 'https://chainlist.org/',
    useExternalBrowser: false,
    walletConnectSupported: false,
    networks: [] // All networks
  }
];
