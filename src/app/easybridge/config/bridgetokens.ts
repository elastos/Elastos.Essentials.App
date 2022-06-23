import { BridgeableToken } from "../model/bridgeabletoken";

export const bridgeableTokens: {
  tokens: BridgeableToken[];
} = {
  tokens: [
    // NATIVE
    {
      "name": "Native ELA on ESC",
      "symbol": "ELA",
      "address": null,
      "chainId": 20,
      "decimals": 18,
      "minTx": 1,
      isNative: true
    },
    {
      "name": "Native HT on Heco",
      "symbol": "HT",
      "address": null,
      "chainId": 128,
      "decimals": 18,
      "minTx": 1,
      isNative: true
    },
    // ERC20
    {
      "name": "ETH on Elastos",
      "symbol": "ETH",
      "address": "0x802c3e839E4fDb10aF583E3E759239ec7703501e",
      "chainId": 20,
      "decimals": 18,
      "origin": 1,
      "minTx": 1,
      isNative: false
    },
    {
      "name": "HT on Elastos",
      "symbol": "HT",
      "address": "0xeceefC50f9aAcF0795586Ed90a8b9E24f55Ce3F3",
      "chainId": 20,
      "decimals": 18,
      "origin": 128,
      isNative: false
    },
    {
      "name": "ELA on Ethereum",
      "symbol": "ELA",
      "address": "0xe6fd75ff38Adca4B97FBCD938c86b98772431867",
      "chainId": 1,
      "decimals": 18,
      "origin": 20,
      "minTx": 1000,
      isNative: false
    },
    {
      "name": "ELA on Heco",
      "symbol": "ELA",
      "address": "0xa1ecFc2beC06E4b43dDd423b94Fef84d0dBc8F5c",
      "chainId": 128,
      "decimals": 18,
      "origin": 20,
      isNative: false
    },
    {
      "name": "HUSD on Elastos",
      "symbol": "HUSD",
      "address": "0xF9Ca2eA3b1024c0DB31adB224B407441bECC18BB",
      "chainId": 20,
      "decimals": 8,
      "origin": 128,
      isNative: false
    },
    {
      "name": "Heco-Peg HUSD",
      "symbol": "HUSD",
      "address": "0x0298c2b32eaE4da002a15f36fdf7615BEa3DA047",
      "chainId": 128,
      "decimals": 8,
      "origin": 128,
      isNative: false
    },
    {
      "name": "FILDA on Heco",
      "symbol": "FILDA",
      "address": "0xE36FFD17B2661EB57144cEaEf942D95295E637F0",
      "chainId": 128,
      "decimals": 18,
      "origin": 128,
      isNative: false
    },
    {
      "name": "FILDA on Elastos",
      "symbol": "FILDA",
      "address": "0xB9Ae03e3320235D3a8AE537f87FF8529b445B590",
      "chainId": 20,
      "decimals": 18,
      "origin": 128,
      isNative: false
    },
    {
      "name": "USD Coin",
      "symbol": "USDC",
      "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "chainId": 1,
      "decimals": 6,
      "origin": 1,
      "minTx": 5000,
      isNative: false
    },
    {
      "name": "USDC on Elastos",
      "symbol": "USDC",
      "address": "0xA06be0F5950781cE28D965E5EFc6996e88a8C141",
      "chainId": 20,
      "decimals": 6,
      "origin": 1,
      "minTx": 5000,
      isNative: false
    },
    {
      "name": "Glide",
      "symbol": "GLIDE",
      "address": "0xd39eC832FF1CaaFAb2729c76dDeac967ABcA8F27",
      "chainId": 20,
      "decimals": 18,
      "origin": 20,
      isNative: false
    },
    {
      "name": "Glide on Heco",
      "symbol": "GLIDE",
      "address": "0x8bD946896c0089cEea90b5dABa5A472684A3fA48",
      "chainId": 128,
      "decimals": 18,
      "origin": 20,
      isNative: false
    },
    {
      "name": "Material",
      "symbol": "MTRL",
      "address": "0x13C99770694f07279607A6274F28a28c33086424",
      "chainId": 1,
      "decimals": 18,
      "origin": 1,
      "minTx": 10000,
      isNative: false
    },
    {
      "name": "Material on Elastos",
      "symbol": "MTRL",
      "address": "0xe2390b8B08a9Ab68e6f1aaA150B2ddD03900CE25",
      "chainId": 20,
      "decimals": 18,
      "origin": 1,
      "minTx": 10000,
      "fee": 2,
      isNative: false
    }
  ]
}
