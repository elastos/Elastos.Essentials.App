export type DAppMenuEntry = {
  icon: string;
  title: string;
  description: string;
  url: string;
  useExternalBrowser: boolean;
  walletConnectSupported: boolean; // Whether the dapp supports wallet connect or not (needed for external navigation on ios for instance - otherwise we don't recommend)
  networks: string[]; // List of network keys in which this dapp can run. Empty list = available everywhere.
}

export const suggestedDApps = (darkMode: boolean): DAppMenuEntry[] => [
  {
    icon: '/assets/browser/dapps/feeds.png',
    title: 'Feeds',
    description: 'Feeds is a decentralized social platform where users remain in full control of their data.',
    url: 'https://feeds.feedsnetwork.io/',
    useExternalBrowser: true,
    walletConnectSupported: true,
    networks: ["elastossmartchain"]
  },
  {
    icon: '/assets/browser/dapps/glidefinance.png',
    title: 'Glide Finance',
    description: 'Elastos ecosystem decentralized exchange',
    url: 'https://glidefinance.io/',
    useExternalBrowser: false,
    walletConnectSupported: true,
    networks: ["elastossmartchain"]
  },
  {
    icon: '/assets/browser/dapps/elacity.png',
    title: 'Elacity',
    description: 'A community driven online marketplace',
    url: 'https://ela.city/',
    useExternalBrowser: false,
    walletConnectSupported: true,
    networks: ["elastossmartchain"]
  },
  {
    icon: '/assets/browser/dapps/pasar.png',
    title: 'Pasar Protocol',
    description: 'Web3.0 Decentralized Marketplace (DeMKT) and Data Exchange',
    url: 'https://pasarprotocol.io/',
    useExternalBrowser: false,
    walletConnectSupported: true,
    networks: ["elastossmartchain"]
  },
  {
    icon: '/assets/browser/dapps/meteast.png',
    title: 'MetEast',
    description: 'Decentralized NFT marketplace on Elastos ESC, with better liquidity, autonomous governance and friendly interactions.',
    url: 'https://meteast.io/',
    useExternalBrowser: false,
    walletConnectSupported: true,
    networks: ["elastossmartchain"]
  },
  {
    icon: '/assets/browser/dapps/cyberrepublic.svg',
    title: 'Cyber Republic',
    description: 'Cyber Republic (CR) is the community that has naturally formed around Elastos.',
    url: 'https://www.cyberrepublic.org/',
    useExternalBrowser: false,
    walletConnectSupported: true, // Not really, but we can open on ios, as this is a non web3 dapps
    networks: ["elastossmartchain"]
  },
  {
    icon: '/assets/browser/dapps/anyswap.svg',
    title: 'AnySwap',
    description: 'Anyswap is a fully decentralized cross chain swap protocol, based on Fusion DCRM technology, with automated pricing and liquidity system.',
    url: 'https://anyswap.exchange/',
    useExternalBrowser: false,
    walletConnectSupported: true,
    networks: ["arbitrum", "avalanchecchain", "bsc", "eth", "heco", "fusion", "fantom", "polygon", "telos"]
  },
  {
    icon: '/assets/browser/dapps/creda.png',
    title: 'CreDA',
    description: "The world's first trusted decentralized credit rating service to create a universal trust score for Web 3.0.",
    url: 'https://creda.app/',
    useExternalBrowser: false,
    walletConnectSupported: true,
    networks: ["arbitrum", "elastossmartchain", "bsc", "ethereum"]
  },
  {
    icon: '/assets/browser/dapps/elk.svg',
    title: 'ElkDex by ElkFinance',
    description: 'Elk Finance is a decentralized network for cross-chain liquidity. Our motto is "Any chain, anytime, anywhere.™',
    url: 'https://app.elk.finance/',
    useExternalBrowser: false,
    walletConnectSupported: false,
    networks: ["elastossmartchain", "heco", "bsc", "avalanchecchain", "fantom", "polygon", "telos"]
  },
  {
    icon: '/assets/browser/dapps/filda.png',
    title: 'FilDA',
    description: 'Multi-assets lending and borrowing DeFi platform',
    url: 'https://app.filda.io/',
    useExternalBrowser: false,
    walletConnectSupported: true,
    networks: ["heco", "bsc", "elastossmartchain"]
  },
  {
    icon: '/assets/browser/dapps/idriss.png',
    title: 'IDriss',
    description: 'Link wallet addresses from multiple networks to emails, phone numbers or @Twitter usernames, enabling quick lookup and payments (registry on Polygon).',
    url: 'https://www.idriss.xyz/',
    useExternalBrowser: false,
    walletConnectSupported: false,
    networks: ["elastossmartchain", "polygon"]
  },
  /* {
      icon: '/assets/browser/dapps/profile.png',
      title: 'Profile',
      description: 'A better way to be online using Elastos DID',
      url: 'https://profile.site/',
      useExternalBrowser: false,
      networks: ["elastossmartchain"]
  }, */
  {
    icon: '/assets/browser/dapps/mdex.png',
    title: 'Mdex',
    description: 'An AMM-based decentralized transaction protocol that integrates DEX, IMO & DAO',
    url: 'https://ht.mdex.co/',
    useExternalBrowser: false,
    walletConnectSupported: false,
    networks: ["heco"]
  },
  {
    icon: '/assets/browser/dapps/mdex.png',
    title: 'Mdex',
    description: 'An AMM-based decentralized transaction protocol that integrates DEX, IMO & DAO',
    url: 'https://bsc.mdex.co/',
    useExternalBrowser: false,
    walletConnectSupported: false,
    networks: ["bsc"]
  },
  // {
  //     icon: '/assets/browser/dapps/rocketx.png',
  //     title: 'RocketX - Skyscanner Crypto',
  //     description: ' RocketX aggregates Centralised and Decentralised Crypto Exchanges and makes it really simple to trade ANY token listed on ANY exchange. Best rates with minimal slippage.',
  //     url: 'https://staging.rocketx.exchange/',
  //     useExternalBrowser: false,
  //     walletConnectSupported: false,
  //     networks: ["avalanchecchain", "bsc", "ethereum", "polygon"]
  // },
//   {
//     icon: '/assets/browser/dapps/raven.png',
//     title: 'Moe Raven',
//     description: 'The magical matic yield optimizer',
//     url: 'https://raven.moe/',
//     useExternalBrowser: false,
//     walletConnectSupported: false,
//     networks: ["elastossmartchain", "polygon"]
//   },
  {
    icon: '/assets/browser/dapps/tokbridge.svg',
    title: 'Shadow Tokens',
    description: 'Bridge assets between Elastos and other chains',
    url: 'https://tokbridge.net/',
    useExternalBrowser: false,
    walletConnectSupported: false, // Seems to be supported on the website but not working
    networks: ["elastossmartchain", "heco", "bsc", "ethereum"]
  },
  {
    icon: '/assets/browser/dapps/tokswap.png',
    title: 'TokSwap',
    description: 'Swap your tokens on the Elastos blockchain',
    url: 'https://tokswap.net/',
    useExternalBrowser: false,
    walletConnectSupported: false,
    networks: ["elastossmartchain"]
  },
  /* {
      icon: '/assets/browser/dapps/tin.jpg',
      title: 'Tin.network',
      description: 'Manage your DeFi assets and liabilities in one simple interface',
      url: 'https://tin.network/',
      useExternalBrowser: false,
      walletConnectSupported: true, // Not really, but not needed
      networks: []
  }, */
  /* {
      icon: '/assets/browser/dapps/cryptoname.png',
      title: 'Cryptoname',
      description: 'CryptoName is your passport to the crypto world',
      url: 'https://cryptoname.org/',
      useExternalBrowser: false,
      walletConnectSupported: false,
      networks: ["elastossmartchain"]
  }, */
  {
    icon: '/assets/browser/dapps/sushiswap.png',
    title: 'Sushiswap',
    description: 'Be a DeFi Chef with Sushi. Swap, earn, stack yields, lend, borrow ...',
    url: 'https://app.sushi.com/',
    useExternalBrowser: false,
    walletConnectSupported: true,
    networks: ["ethereum", "fantom", "bsc", "kava", "polygon", "telos"]
  },
  {
    icon: '/assets/browser/dapps/kava.svg',
    title: 'Kava',
    description: "Kava is the DeFi lending platform for the world's largest cryptocurrencies.",
    url: 'https://app.kava.io/',
    useExternalBrowser: false,
    walletConnectSupported: true,
    networks: ["kava"]
  },
  {
    icon: '/assets/browser/dapps/chainlist.svg',
    title: 'ChainList',
    description: "Chainlist is a list of most EVM networks. Easily browse and add custom networks from there",
    url: 'https://chainlist.org/',
    useExternalBrowser: false,
    walletConnectSupported: false,
    networks: [] // All networks
  },
];