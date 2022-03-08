import { Config } from "src/app/wallet/config/Config";
import { AnyNetworkWallet } from "src/app/wallet/model/networks/base/networkwallets/networkwallet";
import { StandardCoinName } from "../../../../../../coin";
import { ElastosEVMSubWallet } from "../../../subwallets/standard/elastos.evm.subwallet";

export class EidSubWallet extends ElastosEVMSubWallet {
  constructor(networkWallet: AnyNetworkWallet) {
    super(networkWallet, StandardCoinName.ETHDID, "Identity Chain");
  }

  public async initialize() {
    await super.initialize();

    this.withdrawContractAddress = Config.ETHDID_WITHDRAW_ADDRESS.toLowerCase();
    this.publishdidContractAddress = Config.ETHDID_CONTRACT_ADDRESS.toLowerCase();
  }

  /* public async createIDTransaction(payload: string): Promise<string> {
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
    Logger.log('wallet', 'createIDTransaction gasPrice:', gasPrice.toString(), ' nonce:', nonce, ' ContractAddress:', Config.ETHDID_CONTRACT_ADDRESS);
    return SPVService.instance.createTransferGeneric(
      jsToSpvWalletId(this.masterWallet.id),
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
  } */

  public supportInternalTransactions() {
    return false;
  }
}