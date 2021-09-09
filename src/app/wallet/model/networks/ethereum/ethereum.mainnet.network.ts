import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../Coin";
import { EVMNetwork } from "../evm.network";
import { EthereumAPI, EthereumAPIType } from "./ethereum.api";

// https://rpc.info/#ethereum-rpc
export class EthereumMainNetNetwork extends EVMNetwork {
  constructor() {
    super(
      "ethereum",
      "ETH",
      "assets/wallet/networks/ethereum.png",
      "ETH",
      "ETH",
      EthereumAPI.getApiUrl(EthereumAPIType.RPC, "mainnet"),
      EthereumAPI.getApiUrl(EthereumAPIType.ACCOUNT_RPC, "mainnet"),
      MAINNET_TEMPLATE,
      1,
      [
        new ERC20Coin("BNB", "BNB", "BNB", "0xB8c77482e45F1F44dE1745F52C74426C631bDD52", MAINNET_TEMPLATE, false, true),
        new ERC20Coin("USDT", "USDT", "USDT", "0xdac17f958d2ee523a2206206994597c13d831ec7", MAINNET_TEMPLATE, false, true),
        new ERC20Coin("USDC", "USDC", "USDC", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", MAINNET_TEMPLATE, false, true),
        new ERC20Coin("UNI", "UNI", "Uniswap", "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", MAINNET_TEMPLATE, false, true),
        new ERC20Coin("LINK", "LINK", "ChainLink", "0x514910771af9ca656af840dff83e8264ecf986ca", MAINNET_TEMPLATE, false, true),
      ]
    );
  }
}
