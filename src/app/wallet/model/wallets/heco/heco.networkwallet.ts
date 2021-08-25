import { MasterWallet } from "../masterwallet";
import { NetworkWallet } from "../networkwallet";
import { HECOChainSubWallet } from "./heco.subwallet";
import { StandardCoinName } from "../../coin";
import { Network } from "../../networks/network";
import { StandardEVMSubWallet } from "../evm.subwallet";
import { ERC20TokenInfo } from "../../evm.types";

export class HecoNetworkWallet extends NetworkWallet {
  private mainTokenSubWallet: HECOChainSubWallet = null;

  constructor(masterWallet: MasterWallet, network: Network) {
    super(masterWallet, network);
  }

  protected async prepareStandardSubWallets(): Promise<void> {
    this.mainTokenSubWallet = new HECOChainSubWallet(this);
    this.subWallets[StandardCoinName.ETHHECO] = this.mainTokenSubWallet;
    await this.masterWallet.walletManager.spvBridge.createSubWallet(this.masterWallet.id, StandardCoinName.ETHHECO);
  }

  public getDisplayTokenName(): string {
    return 'HT';
  }

  protected getMainEvmSubWallet(): StandardEVMSubWallet {
    return this.mainTokenSubWallet;
  }

  public async getERCTokensList(): Promise<ERC20TokenInfo[]> {
    return await []; // Not yet implemented
  }
}