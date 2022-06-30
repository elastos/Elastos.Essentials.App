import { BridgeableToken } from "../model/bridgeabletoken";

export const bridgeableTokens: {
  tokens: BridgeableToken[];
} = {
  tokens: [
    // NATIVE COINS
    {
      "name": "ELA on ESC",
      "symbol": "ELA",
      "address": null,
      "chainId": 20,
      "decimals": 18,
      isNative: true,
      wrappedAddresses: {
        1: "0xe6fd75ff38Adca4B97FBCD938c86b98772431867", // ELA on Ethereum,
        56: "0x76393bb8Fd7037962ebDB73f3B30F76DdE5CF718", // ELA on BSC,
        128: "0xa1ecFc2beC06E4b43dDd423b94Fef84d0dBc8F5c" // ELA on Heco,
      }
    },
    {
      "name": "HT on Heco",
      "symbol": "HT",
      "address": null,
      "chainId": 128,
      "decimals": 18,
      isNative: true,
      wrappedAddresses: {
        20: "0xeceefC50f9aAcF0795586Ed90a8b9E24f55Ce3F3" // HT on Elastos,
      }
    },
    {
      "name": "BNB on BSC",
      "symbol": "BNB",
      "address": null,
      "chainId": 56,
      "decimals": 18,
      isNative: true,
      wrappedAddresses: {
        20: "0x51B85F3889c7EA8f6d5EdEBFBadaDA0fDcE236c9" // BNB on Elastos,
      }
    },
    {
      "name": "ETH on Ethereum",
      "symbol": "ETH",
      "address": null,
      "chainId": 1,
      "decimals": 18,
      isNative: true,
      wrappedAddresses: {
        20: "0x802c3e839E4fDb10aF583E3E759239ec7703501e" // ETH on Elastos,
      }
    },

    // ERC20-LIKE TOKENS - WRAPPED NATIVE
    {
      "name": "ETH on Elastos",
      "symbol": "ETH",
      "address": "0x802c3e839E4fDb10aF583E3E759239ec7703501e",
      "chainId": 20,
      "decimals": 18,
      "origin": 1,
      isNative: false,
      isWrappedNative: true
    },
    {
      "name": "HT on Elastos",
      "symbol": "HT",
      "address": "0xeceefC50f9aAcF0795586Ed90a8b9E24f55Ce3F3",
      "chainId": 20,
      "decimals": 18,
      "origin": 128,
      isNative: false,
      isWrappedNative: true
    },
    {
      "name": "BNB on Elastos",
      "symbol": "BNB",
      "address": "0x51B85F3889c7EA8f6d5EdEBFBadaDA0fDcE236c9",
      "chainId": 20,
      "decimals": 18,
      "origin": 56,
      "fee": 0.1,
      isNative: false,
      isWrappedNative: true
    },
    {
      "name": "ELA on Ethereum",
      "symbol": "ELA",
      "address": "0xe6fd75ff38Adca4B97FBCD938c86b98772431867",
      "chainId": 1,
      "decimals": 18,
      "origin": 20,
      isNative: false,
      isWrappedNative: true
    },
    {
      "name": "ELA on Heco",
      "symbol": "ELA",
      "address": "0xa1ecFc2beC06E4b43dDd423b94Fef84d0dBc8F5c",
      "chainId": 128,
      "decimals": 18,
      "origin": 20,
      isNative: false,
      isWrappedNative: true
    },
    {
      "name": "ELA on BSC",
      "symbol": "ELA",
      "address": "0x76393bb8Fd7037962ebDB73f3B30F76DdE5CF718",
      "chainId": 56,
      "decimals": 18,
      "origin": 20,
      "fee": 0,
      isNative: false,
      isWrappedNative: true
    },

    // ERC20-LIKE TOKENS - NON NATIVE
    {
      "name": "HUSD on Elastos",
      "symbol": "HUSD",
      "address": "0xF9Ca2eA3b1024c0DB31adB224B407441bECC18BB",
      "chainId": 20,
      "decimals": 8,
      "origin": 128,
      isNative: false,
      wrappedAddresses: {
        128: "0x0298c2b32eaE4da002a15f36fdf7615BEa3DA047" // Heco-Peg HUSD (on heco),
      }
    },
    {
      "name": "Heco-Peg HUSD",
      "symbol": "HUSD",
      "address": "0x0298c2b32eaE4da002a15f36fdf7615BEa3DA047",
      "chainId": 128,
      "decimals": 8,
      "origin": 128,
      isNative: false,
      wrappedAddresses: {
        20: "0xF9Ca2eA3b1024c0DB31adB224B407441bECC18BB" // HUSD on Elastos,
      }
    },
    {
      "name": "FILDA on Heco",
      "symbol": "FILDA",
      "address": "0xE36FFD17B2661EB57144cEaEf942D95295E637F0",
      "chainId": 128,
      "decimals": 18,
      "origin": 128,
      isNative: false,
      wrappedAddresses: {
        20: "0xB9Ae03e3320235D3a8AE537f87FF8529b445B590" // Heco FILDA on Elastos,
      }
    },
    {
      "name": "Heco FILDA on Elastos",
      "symbol": "htFILDA",
      "address": "0xB9Ae03e3320235D3a8AE537f87FF8529b445B590",
      "chainId": 20,
      "decimals": 18,
      "origin": 128,
      isNative: false,
      wrappedAddresses: {
        128: "0xE36FFD17B2661EB57144cEaEf942D95295E637F0" // FILDA on Heco,
      }
    },
    {
      "name": "USD Coin",
      "symbol": "USDC",
      "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "chainId": 1,
      "decimals": 6,
      "origin": 1,
      isNative: false,
      wrappedAddresses: {
        20: "0xA06be0F5950781cE28D965E5EFc6996e88a8C141" // USDC on Elastos
      }
    },
    {
      "name": "USDC on Elastos",
      "symbol": "USDC",
      "address": "0xA06be0F5950781cE28D965E5EFc6996e88a8C141",
      "chainId": 20,
      "decimals": 6,
      "origin": 1,
      isNative: false,
      wrappedAddresses: {
        1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" // USD Coin (on ethereum)
      }
    },
    {
      "name": "Glide",
      "symbol": "GLIDE",
      "address": "0xd39eC832FF1CaaFAb2729c76dDeac967ABcA8F27",
      "chainId": 20,
      "decimals": 18,
      "origin": 20,
      isNative: false,
      wrappedAddresses: {
        128: "0x8bD946896c0089cEea90b5dABa5A472684A3fA48" // Glide on Heco
      }
    },
    {
      "name": "Glide on Heco",
      "symbol": "GLIDE",
      "address": "0x8bD946896c0089cEea90b5dABa5A472684A3fA48",
      "chainId": 128,
      "decimals": 18,
      "origin": 20,
      isNative: false,
      wrappedAddresses: {
        20: "0xd39eC832FF1CaaFAb2729c76dDeac967ABcA8F27" // Glide (on elastos)
      }
    },
    {
      "name": "Material",
      "symbol": "MTRL",
      "address": "0x13C99770694f07279607A6274F28a28c33086424",
      "chainId": 1,
      "decimals": 18,
      "origin": 1,
      isNative: false,
      wrappedAddresses: {
        20: "0xe2390b8B08a9Ab68e6f1aaA150B2ddD03900CE25" // Material on Elastos
      }
    },
    {
      "name": "Material on Elastos",
      "symbol": "MTRL",
      "address": "0xe2390b8B08a9Ab68e6f1aaA150B2ddD03900CE25",
      "chainId": 20,
      "decimals": 18,
      "origin": 1,
      "fee": 2,
      isNative: false,
      wrappedAddresses: {
        1: "0x13C99770694f07279607A6274F28a28c33086424" // Material (on ethereum)
      }
    },
    {
      "name": "Binance USD",
      "symbol": "BUSD",
      "address": "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      "chainId": 56,
      "decimals": 18,
      "origin": 56,
      "fee": 0,
      isNative: false,
      wrappedAddresses: {
        20: "0x9f1d0Ed4E041C503BD487E5dc9FC935Ab57F9a57" // BUSD on Elastos
      }
    },
    {
      "name": "BUSD on Elastos",
      "symbol": "BUSD",
      "address": "0x9f1d0Ed4E041C503BD487E5dc9FC935Ab57F9a57",
      "chainId": 20,
      "decimals": 18,
      "origin": 56,
      "fee": 0.1,
      isNative: false,
      wrappedAddresses: {
        56: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56" // Binance USD (on BSC)
      }
    },
    {
      "name": "Binance BTC",
      "symbol": "BTCB",
      "address": "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
      "chainId": 56,
      "decimals": 18,
      "origin": 56,
      "fee": 0,
      isNative: false,
      wrappedAddresses: {
        20: "0xDF4191Bfe8FAE019fD6aF9433E8ED6bfC4B90CA1" // BTCB on Elastos
      }
    },
    {
      "name": "BTCB on Elastos",
      "symbol": "BTCB",
      "address": "0xDF4191Bfe8FAE019fD6aF9433E8ED6bfC4B90CA1",
      "chainId": 20,
      "decimals": 18,
      "origin": 56,
      "fee": 0.1,
      isNative: false,
      wrappedAddresses: {
        56: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c" // Binance BTC (on BSC)
      }
    }
  ]
}
