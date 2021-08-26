import { MasterWallet } from "../masterwallet";
import { NetworkWallet } from "../networkwallet";
import { StandardCoinName } from "../../Coin";
import { Network } from "../../networks/network";
import { StandardEVMSubWallet } from "../evm.subwallet";
import { ERC20TokenInfo } from "../../evm.types";
import { BscChainSubWallet } from "./bsc.subwallet";

export class BscNetworkWallet extends NetworkWallet {
  private mainTokenSubWallet: BscChainSubWallet = null;

  constructor(masterWallet: MasterWallet, network: Network) {
    super(masterWallet, network);
  }

  protected async prepareStandardSubWallets(): Promise<void> {
    this.mainTokenSubWallet = new BscChainSubWallet(this);
    this.subWallets[StandardCoinName.ETHBSC] = this.mainTokenSubWallet;
    await this.masterWallet.walletManager.spvBridge.createSubWallet(this.masterWallet.id, StandardCoinName.ETHBSC);
  }

  public getDisplayTokenName(): string {
    return 'BNB';
  }

  public getMainEvmSubWallet(): StandardEVMSubWallet {
    return this.mainTokenSubWallet;
  }

  public async getERCTokensList(): Promise<ERC20TokenInfo[]> {
    return await []; // Not yet implemented
  }
}