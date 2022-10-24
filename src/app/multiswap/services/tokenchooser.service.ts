import { Injectable } from "@angular/core";
import BigNumber from "bignumber.js";
import { BehaviorSubject } from "rxjs";
import { Coin, ERC20Coin } from "src/app/wallet/model/coin";
import { AnyNetworkWallet } from "src/app/wallet/model/networks/base/networkwallets/networkwallet";
import { EVMNetwork } from "src/app/wallet/model/networks/evms/evm.network";
import { ERC20CoinService } from "src/app/wallet/services/evm/erc20coin.service";

@Injectable({
  providedIn: "root"
})
export class TokenChooserService {
  public static instance: TokenChooserService;

  // Cache of coin balances. This cache is a memory cache, never refreshed until resetAllBalances() is called.
  private balances: { [coinKey: string]: BehaviorSubject<BigNumber> } = {};

  constructor(
    private erc20CoinService: ERC20CoinService
  ) {
    TokenChooserService.instance = this;
  }

  public getCoinBalance(coin: Coin, walletAddress: string, networkWallet: AnyNetworkWallet): BehaviorSubject<BigNumber> {
    const coinKey = coin.key() + '-' + networkWallet.id;
    if (this.balances[coinKey])
      return this.balances[coinKey];

    // Initialize with null balance, meaning fetching is started but balance is unknown yet
    this.balances[coinKey] = new BehaviorSubject(null);

    if (coin instanceof ERC20Coin) {
      // We don't use the subwallet, to be able to fetch erc20 tokens balances for coins not added in the wallet
      void this.erc20CoinService.fetchERC20TokenBalance(<EVMNetwork>coin.network, coin.getContractAddress(), walletAddress).then(balance => {
        this.balances[coinKey]?.next(this.erc20CoinService.toHumanReadableAmount(balance, coin.decimals));
      });
    }
    else {
      // Native coin - the subwallet is always there.
      let mainCoinSubwallet = networkWallet.getSubWallet(coin.getID());
      void mainCoinSubwallet.updateBalance().then(() => {
        this.balances[coinKey]?.next(mainCoinSubwallet.getBalance());
      });
    }

    return this.balances[coinKey];
  }

  /**
   * Deletes balance cache to restart fetching balances
   */
  public resetAllBalances() {
    this.balances = {};
  }
}