import { from } from "@iotexproject/iotex-address-ts";
import { lazyEthersImport, lazyEthersLibUtilImport } from "src/app/helpers/import.helper";
import { Logger } from "src/app/logger";
import { AuthService } from "src/app/wallet/services/auth.service";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { EVMService } from "src/app/wallet/services/evm/evm.service";
import { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { AddressUsage } from "../../../safes/addressusage";
import { SignTransactionResult } from "../../../safes/safe.types";
import { StandardSafe } from "../../../safes/standard.safe";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { EVMSafe } from "../../evms/safes/evm.safe";
import { AnyNetwork } from "../../network";

export class IoTeXStandardSafe extends StandardSafe implements EVMSafe {
  protected evmAddress: string = null;
  protected iotexAddress: string = null; // TODO: persistence to not prompt password every time

  constructor(protected masterWallet: MasterWallet, protected network: AnyNetwork, protected gRPCUrl: string) {
    super(masterWallet);
  }

  public async initialize(networkWallet: AnyNetworkWallet): Promise<void> {
    // Check if the address is already computed or not  (first time). If not, request the
    // master password to compute it
    this.evmAddress = await networkWallet.loadContextInfo("evmAddress");
    if (!this.evmAddress) {
      // No data - need to compute
      let payPassword = await AuthService.instance.getWalletPassword(this.masterWallet.id);
      if (!payPassword)
        return; // Can't continue without the wallet password - cancel the initialization

      let seed = await (this.masterWallet as StandardMasterWallet).getSeed(payPassword);
      if (seed) {
        let jsWallet = await this.getWalletFromSeed(seed);
        this.evmAddress = jsWallet.address;
      }
      else {
        // No mnemonic - check if we have a private key instead
        let privateKey = await (this.masterWallet as StandardMasterWallet).getPrivateKey(payPassword);
        if (privateKey) {
          let account = (await EVMService.instance.getWeb3(networkWallet.network)).eth.accounts.privateKeyToAccount(privateKey);
          this.evmAddress = account.address;
        }
      }

      if (this.evmAddress)
        await networkWallet.saveContextInfo("evmAddress", this.evmAddress);
    }

    const addr = from(this.evmAddress);
    this.iotexAddress = addr.string();
  }

  public getAddresses(startIndex: number, count: number, internalAddresses: boolean, usage: AddressUsage | string): string[] {
    if (usage === AddressUsage.IOTEX || usage === AddressUsage.RECEIVE_FUNDS || usage === AddressUsage.SEND_FUNDS)
      return [this.iotexAddress];
    else
      return [this.evmAddress];
  }

  createContractTransaction(contractAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number, data: any): Promise<any> {
    return EVMService.instance.createUnsignedContractTransaction(contractAddress, amount, gasPrice, gasLimit, nonce, data);
  }

  createTransferTransaction(toAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any> {
    return EVMService.instance.createUnsignedTransferTransaction(toAddress, amount, gasPrice, gasLimit, nonce);
  }

  public async signTransaction(subWallet: AnySubWallet, rawTx: any, transfer: Transfer): Promise<SignTransactionResult> {
    let signTransactionResult: SignTransactionResult = {
      signedTransaction: null
    }

    let web3 = await EVMService.instance.getWeb3(this.network);

    // No data - need to compute
    let payPassword = await AuthService.instance.getWalletPassword(this.masterWallet.id);
    if (!payPassword)
      return signTransactionResult;

    // TODO: handle wallets imported by private key
    let privateKey = null;
    let seed = await (this.masterWallet as StandardMasterWallet).getSeed(payPassword);
    if (seed) {
      let jsWallet = await this.getWalletFromSeed(seed)
      privateKey = jsWallet.privateKey;
    } else {
      // No mnemonic - check if we have a private key instead
      privateKey = await (this.masterWallet as StandardMasterWallet).getPrivateKey(payPassword);
      if (!privateKey) {
        Logger.warn('wallet', 'IoTeXStandardSafe::signTransaction can not find the private key');
        return signTransactionResult;
      }
    }

    let signResult = await web3.eth.accounts.signTransaction(rawTx, privateKey);

    signTransactionResult.signedTransaction = signResult.rawTransaction;
    return signTransactionResult;
  }

  private async getWalletFromSeed(seed: string) {
    const { Wallet } = await lazyEthersImport();
    const { HDNode, defaultPath } = await lazyEthersLibUtilImport();
    return new Wallet(HDNode.fromSeed(Buffer.from(seed, "hex")).derivePath(defaultPath));
  }
}