import { json } from "@elastosfoundation/wallet-js-sdk/typings/types";
import { Logger } from "src/app/logger";
import { AuthService } from "src/app/wallet/services/auth.service";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { EVMService } from "src/app/wallet/services/evm/evm.service";
import { StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { SignTransactionResult } from "../../../safes/safe.types";
import { WalletJSSafe } from "../../../safes/walletjs.safe";
import { WalletUtil } from "../../../wallet.util";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { EVMSafe } from "./evm.safe";

/**
 * Safe specialized for EVM networks, with additional methods.
 */
export class EVMWalletJSSafe extends WalletJSSafe implements EVMSafe {
  private mnemonicWallet = null;
  private account = null;
  private evmAddress = null;

  public async initialize(networkWallet: AnyNetworkWallet): Promise<void> {
    await super.initialize(networkWallet);

    // Check if the address is already computed or not  (first time). If not, request the
    // master password to compute it
    this.evmAddress = await networkWallet.loadContextInfo("evmAddress");
    if (!this.evmAddress) {
      await this.initJSWallet()

      if (this.mnemonicWallet) {
        this.evmAddress = this.mnemonicWallet.address;
      } else if (this.account) {
        this.evmAddress = this.account.address;
      }

      if (this.evmAddress)
        await networkWallet.saveContextInfo("evmAddress", this.evmAddress);
    }
  }

  private async initJSWallet() {
    if (this.mnemonicWallet || this.account) return;

    // No data - need to compute
    let payPassword = await AuthService.instance.getWalletPassword(this.masterWallet.id);
    if (!payPassword)
      return; // Can't continue without the wallet password - cancel the initialization

    let mnemonic = await (this.masterWallet as StandardMasterWallet).getMnemonic(payPassword);
    if (mnemonic) {
      this.mnemonicWallet = await this.getWalletFromMnemonic(mnemonic);
    }
    else {
      // No mnemonic - check if we have a private key instead
      let privateKey = await (this.masterWallet as StandardMasterWallet).getPrivateKey(payPassword);
      if (privateKey) {
        this.account = (await EVMService.instance.getWeb3(this.networkWallet.network)).eth.accounts.privateKeyToAccount(privateKey);
      }
    }
  }

  public getAddresses(startIndex: number, count: number, internalAddresses: boolean): Promise<string[]> {
    return Promise.resolve([this.evmAddress]);
  }

  public createTransferTransaction(toAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any> {
    return EVMService.instance.createUnsignedTransferTransaction(toAddress, amount, gasPrice, gasLimit, nonce);
  }

  public createContractTransaction(contractAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number, data: any): Promise<any> {
    return EVMService.instance.createUnsignedContractTransaction(contractAddress, amount, gasPrice, gasLimit, nonce, data);
  }

  public async signTransaction(subWallet: AnySubWallet, rawTransaction: json, transfer: Transfer, forcePasswordPrompt = true, visualFeedback = true): Promise<SignTransactionResult> {
    Logger.log('wallet', ' signTransaction rawTransaction', rawTransaction)

    let signedTx = null

    // Must be confirmed by the user.
    let payPassword = await AuthService.instance.getWalletPassword(this.masterWallet.id, true, true);
    if (!payPassword)
      return { signedTransaction: signedTx };

    await this.initJSWallet();

    if (this.mnemonicWallet) {
        signedTx = await this.mnemonicWallet.signTransaction(rawTransaction)
    } else if (this.account) {
        let signdTransaction = await this.account.signTransaction(rawTransaction)
        signedTx = signdTransaction.rawTransaction;
    }
    return { signedTransaction: signedTx };
  }

  private async getWalletFromMnemonic(mnemonic: string) {
    let wordlist = await WalletUtil.getMnemonicWordlist(mnemonic);
    const Wallet = (await import("ethers")).Wallet;
    return Wallet.fromMnemonic(mnemonic, null, wordlist);
  }
}