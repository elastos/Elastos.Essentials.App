import { Logger } from "src/app/logger";
import { Config } from "src/app/wallet/config/Config";
import { StandardCoinName } from "../../Coin";
import { NetworkWallet } from "../networkwallet";
import { ElastosEVMSubWallet } from "./elastos.evm.subwallet";

export class EidSubWallet extends ElastosEVMSubWallet {
  constructor(networkWallet: NetworkWallet) {
    super(networkWallet, StandardCoinName.ETHDID);
  }

  protected async initialize() {
    await super.initialize();

    this.withdrawContractAddress = Config.ETHDID_WITHDRAW_ADDRESS.toLowerCase();
    this.publishdidContractAddress = Config.ETHDID_CONTRACT_ADDRESS.toLowerCase();
  }


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

    const publishDIDContract = new this.web3.eth.Contract(contractAbi, Config.ETHDID_CONTRACT_ADDRESS);
    const gasPrice = await this.getGasPrice();
    const method = publishDIDContract.methods.publishDidTransaction(payload);
    let gasLimit = 200000;
    try {
      // Estimate gas cost
      gasLimit = await method.estimateGas();
      Logger.log('wallet', 'estimateGas :', gasLimit);
    } catch (error) {
      Logger.warn('wallet', 'estimateGas error:', error);
    }
    const data = method.encodeABI();
    let nonce = await this.getNonce();
    Logger.log('wallet', 'createIDTransaction gasPrice:', gasPrice.toString(), ' nonce:', nonce, ' ContractAddress:', Config.ETHDID_CONTRACT_ADDRESS);
    return this.masterWallet.walletManager.spvBridge.createTransferGeneric(
      this.masterWallet.id,
      this.id,
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