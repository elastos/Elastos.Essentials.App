import { CoinID, StandardCoinName } from "../../coin";
import { ERC20SubWallet } from "../erc20.subwallet";
import { NetworkWallet } from "../networkwallet";
import { HecoAPI, HecoApiType } from "./heco.api";

/**
 * Subwallet for HRC20 tokens.
 */
export class HecoERC20SubWallet extends ERC20SubWallet {
  constructor(networkWallet: NetworkWallet, coinID: CoinID) {
    super(networkWallet, coinID, HecoAPI.getApiUrl(HecoApiType.RPC));

    this.elastosChainCode = StandardCoinName.ETHHECO;
  }

  public getMainIcon(): string {
    return "assets/wallet/coins/eth-purple.svg";
  }

  public getSecondaryIcon(): string {
    return "assets/wallet/networks/hecochain.png";
  }

  public getDisplayableERC20TokenInfo(): string {
    return "HRC20 Token";
  }

  protected async getTransactionsByRpc() {
    // Do nothing for now - Not implemented / Not sure we can get this for heco.
  }
}