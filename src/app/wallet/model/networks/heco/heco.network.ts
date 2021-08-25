import { ERC20Coin } from "../../coin";
import { ERC20SubWallet } from "../../wallets/erc20.subwallet";
import { HecoNetworkWallet } from "../../wallets/heco/heco.networkwallet";
import { MasterWallet } from "../../wallets/masterwallet";
import { NetworkWallet } from "../../wallets/NetworkWallet";
import { Network } from "../network";

export class HECONetwork extends Network {
  constructor() {
    super("heco", "HECO", "assets/wallet/networks/hecochain.png");
  }

  public getBuiltInERC20Coins(networkTemplate: string): ERC20Coin[] {
    return [];
  }

  public createNetworkWallet(masterWallet: MasterWallet): NetworkWallet {
    return new HecoNetworkWallet(masterWallet, this);
  }
}
