import { CoinID, StandardCoinName } from "../../Coin";
import { ERC20SubWallet } from "../erc20.subwallet";
import { NetworkWallet } from "../networkwallet";
import { BscAPI, BscApiType } from "./bsc.api";

/**
 * Subwallet for RC20 tokens.
 */
export class BscERC20SubWallet extends ERC20SubWallet {
  constructor(networkWallet: NetworkWallet, coinID: CoinID) {
    super(networkWallet, coinID, BscAPI.getApiUrl(BscApiType.RPC));

    this.elastosChainCode = StandardCoinName.ETHBSC;
  }

  public getMainIcon(): string {
    return "assets/wallet/coins/eth-purple.svg";
  }

  public getSecondaryIcon(): string {
    return "assets/wallet/networks/bscchain.png";
  }

  public getDisplayableERC20TokenInfo(): string {
    return "BEP20 Token";
  }

  protected async getTransactionsByRpc() {
    // Do nothing for now - Not implemented / Not sure we can get this for bsc.
  }
}