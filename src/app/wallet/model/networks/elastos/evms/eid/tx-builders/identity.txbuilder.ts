import { Logger } from "src/app/logger";
import { Util } from "src/app/model/util";
import { Config } from "src/app/wallet/config/Config";
import { EVMSafe } from "../../../../evms/safes/evm.safe";
import { EVMTransactionBuilder } from "../../../../evms/tx-builders/evm.txbuilder";

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

export class IdentityTransactionBuilder extends EVMTransactionBuilder {
  public async createIDTransaction(payload: string, gasPriceArg: string = null, gasLimitArg: string = null): Promise<string> {
    const publishDIDContract = new ((await this.getWeb3()).eth.Contract)(contractAbi as any, Config.ETHDID_CONTRACT_ADDRESS);
    const method = publishDIDContract.methods.publishDidTransaction(payload);

    let gasPrice = gasPriceArg;
    if (gasPrice === null) {
      gasPrice = await this.getGasPrice();
    }

    let gasLimit = gasLimitArg;
    if (gasLimit === null) {
      gasLimit = await this.estimateGasByMethod(method);
    }

    let nonce = await this.getNonce();
    Logger.log('wallet', 'createIDTransaction gasPrice:', gasPrice, ' nonce:', nonce, ' ContractAddress:', Config.ETHDID_CONTRACT_ADDRESS);

    return (this.networkWallet.safe as unknown as EVMSafe).createContractTransaction(Config.ETHDID_CONTRACT_ADDRESS, '0', gasPrice, gasLimit, nonce, method.encodeABI());
  }

  public async estimateGas(payload: string) {
    const publishDIDContract = new ((await this.getWeb3()).eth.Contract)(contractAbi as any, Config.ETHDID_CONTRACT_ADDRESS);
    const method = publishDIDContract.methods.publishDidTransaction(payload);
    return await this.estimateGasByMethod(method);
  }

  private async estimateGasByMethod(method) {
    let gasLimit = 200000;
    try {
      // Estimate gas cost
      let gasLimitTemp = await method.estimateGas();
      //'* 1.5': Make sure the gaslimit is big enough.
      gasLimit = Util.ceil(gasLimitTemp * 1.5);
    } catch (error) {
      Logger.warn('wallet', 'estimateGas error:', error);
    }
    return gasLimit.toString();
  }
}