import { CoinID } from "../../coin";
import { ERC20SubWallet } from "../erc20.subwallet";
import { NetworkWallet } from "../NetworkWallet";

/**
 * Subwallet for Elastos-ERC20 tokens.
 */
export class ElastosERC20SubWallet extends ERC20SubWallet {
  constructor(networkWallet: NetworkWallet, coinID: CoinID) {
    super(networkWallet, coinID);
  }

  public getMainIcon(): string {
    return "assets/wallet/coins/eth-purple.svg";
  }

  public getSecondaryIcon(): string {
    return "assets/wallet/coins/ela-black.svg";
  }
}