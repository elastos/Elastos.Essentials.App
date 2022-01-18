import { Logger } from "src/app/logger";
import { Util } from "src/app/model/util";
import { Config } from "src/app/wallet/config/Config";
import { StandardCoinName } from "../../coin";
import { BridgeProvider } from "../../earn/bridgeprovider";
import { EarnProvider } from "../../earn/earnprovider";
import { SwapProvider } from "../../earn/swapprovider";
import { NetworkWallet } from "../networkwallet";
import { ElastosEVMSubWallet } from "./elastos.evm.subwallet";

export class EidSubWallet extends ElastosEVMSubWallet {
  constructor(networkWallet: NetworkWallet) {
    super(networkWallet, StandardCoinName.ETHDID);
  }

  public async initialize() {
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

  // We do now EID support such features for the EID chain for now (only ESC), so we override the default
  // implementation to return nothing
  public getAvailableEarnProviders(): EarnProvider[] {
    return [];
  }

  // We do now EID support such features for the EID chain for now (only ESC), so we override the default
  // implementation to return nothing
  public getAvailableSwapProviders(): SwapProvider[] {
    return [];
  }

  // We do now EID support such features for the EID chain for now (only ESC), so we override the default
  // implementation to return nothing
  public getAvailableBridgeProviders(): BridgeProvider[] {
    return [];
  }

  public supportInternalTransactions() {
    return false;
  }
}