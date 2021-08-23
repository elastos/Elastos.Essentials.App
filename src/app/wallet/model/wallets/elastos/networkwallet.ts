import { CoinService } from "src/app/wallet/services/coin.service";
import { StandardCoinName } from "../../Coin";
import { MasterWallet } from "../masterwallet";
import { NetworkWallet } from "../NetworkWallet";
import { SubWallet } from "../subwallet";
import { MainchainSubWallet } from "./mainchain.subwallet";
import { StandardSubWalletBuilder } from "./StandardSubWalletBuilder";

export class ElastosNetworkWallet extends NetworkWallet {
  constructor(masterWallet: MasterWallet) {
    super(masterWallet);

    // DIRTY TEST
    void (async () => {
      this.subWallets[StandardCoinName.ELA] = await StandardSubWalletBuilder.newFromCoin(this, CoinService.instance.getCoinByID(StandardCoinName.ELA));
    })();
  }

  /**
   * Tells whether this wallet currently has many addresses in use or not.
   */
  public async multipleAddressesInUse(): Promise<boolean> {
    let mainchainSubwallet : MainchainSubWallet = this.subWallets[StandardCoinName.ELA] as MainchainSubWallet;
    let txListsInternal = await mainchainSubwallet.getTransactionByAddress(true, 0);
    if (txListsInternal.length > 1) {
      return true;
    }
    let txListsExternal = await mainchainSubwallet.getTransactionByAddress(false, 0);
    if (txListsExternal.length > 1) {
      return true;
    }

    return false;
  }
}