import { EVMService } from "src/app/wallet/services/evm/evm.service";
import type Web3 from "web3";
import { TransactionBuilder } from "../../base/tx-builders/transactionbuilder";
import { EVMNetwork } from "../evm.network";

export abstract class EVMTransactionBuilder extends TransactionBuilder {
  protected getWeb3(): Promise<Web3> {
    return EVMService.instance.getWeb3(this.networkWallet.network as EVMNetwork);
  }

  /**
   * Returns the current gas price on chain.
   */
  protected async getGasPrice(): Promise<string> {
    const gasPrice = await (await this.getWeb3()).eth.getGasPrice();
    //Logger.log('wallet', "GAS PRICE: ", gasPrice)
    return gasPrice;
  }

  public async getWalletAddress(): Promise<string> {
    return (await this.networkWallet.getAddresses())[0].address;
  }

  public async getNonce(): Promise<number> {
    return EVMService.instance.getNonce(this.networkWallet.network, await this.getWalletAddress());
  }
}