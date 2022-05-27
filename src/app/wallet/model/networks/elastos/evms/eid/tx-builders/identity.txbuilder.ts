import { Logger } from "src/app/logger";
import { Util } from "src/app/model/util";
import { Config } from "src/app/wallet/config/Config";
import { jsToSpvWalletId, SPVService } from "src/app/wallet/services/spv.service";
import { EVMTransactionBuilder } from "../../../../evms/tx-builders/evm.txbuilder";

export class IdentityTransactionBuilder extends EVMTransactionBuilder {
  public async createIDTransaction(payload: string): Promise<string> {
    const contractAbi = [
      {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "inputs": [
          {
            "internalType": "string",
            "name": "data",
            "type": "string"
          }
        ],
        "name": "publishDidTransaction",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ];

    const publishDIDContract = new (this.getWeb3().eth.Contract)(contractAbi as any, Config.ETHDID_CONTRACT_ADDRESS);
    const gasPrice = await this.getGasPrice();
    const method = publishDIDContract.methods.publishDidTransaction(payload);
    let gasLimit = 200000;
    try {
      // Estimate gas cost
      let gasLimitTemp = await method.estimateGas();
      //'* 1.5': Make sure the gaslimit is big enough.
      gasLimit = Util.ceil(gasLimitTemp * 1.5);
    } catch (error) {
      Logger.warn('wallet', 'estimateGas error:', error);
    }
    const data = method.encodeABI();
    let nonce = await this.getNonce();
    Logger.log('wallet', 'createIDTransaction gasPrice:', gasPrice, ' nonce:', nonce, ' ContractAddress:', Config.ETHDID_CONTRACT_ADDRESS);

    // IMPORTANT NOTE: FOR NOW WE CONSIDER THAT WE DO HAVE A WALLET AND SUBWALLET IN THE SPV SDK,
    // BASED ON THE SUBWALLET MASTER WALLET ID. THIS IS TRUE AS LONG AS WE USE THE SPV SDK TO MANAGE TRANSACTIONS
    // BUT WILL BECOME FALSE LATER, WHEN THE SPV SDK IS USED ONLY TO CREATE TRANSACTIONS.
    // AT THAT TIME WE WILL NEED TO USE A VIRTUAL SPV WALLET JUST TO CREATE TRANSACTIONS.
    return SPVService.instance.createTransferGeneric(
      jsToSpvWalletId(this.networkWallet.masterWallet.id),
      this.networkWallet.network.getEVMSPVConfigName(), // TODO: check this: was "this.id" (subwallet id)
      Config.ETHDID_CONTRACT_ADDRESS,
      '0',
      0, // WEI
      gasPrice,
      0, // WEI
      gasLimit.toString(),
      data,
      nonce
    );
  }
}