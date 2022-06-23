import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { CoinID, StandardCoinName } from "../../coin";
import { ERC20SubWallet } from "../erc20.subwallet";
import { NetworkWallet } from "../networkwallet";

/**
 * Subwallet for Elastos-ERC20 tokens.
 */
export class ElastosERC20SubWallet extends ERC20SubWallet {
  constructor(networkWallet: NetworkWallet, coinID: CoinID) {
    let rpcApiUrl = GlobalElastosAPIService.instance.getApiUrlForChainCode(StandardCoinName.ETHSC);
    super(networkWallet, coinID, rpcApiUrl, "Elastos-ERC20 token");

    this.spvConfigEVMCode = StandardCoinName.ETHSC;
  }

  public getMainIcon(): string {
    return "assets/wallet/coins/ela-gray.svg";
  }

  public getSecondaryIcon(): string {
    return null;
    //return "assets/wallet/coins/eth-purple.svg";
  }

  public getDisplayableERC20TokenInfo(): string {
    return "";// GlobalLanguageService.instance.translate('wallet.ela-erc20'); // "Elastos ERC20 token" is confusing.
  }
}