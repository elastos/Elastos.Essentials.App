import type { json } from "@elastosfoundation/wallet-js-sdk";
import { ecsign, toRpcSig } from "ethereumjs-util";
import { Logger } from "src/app/logger";
import { AuthService } from "src/app/wallet/services/auth.service";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { EVMService } from "src/app/wallet/services/evm/evm.service";
import { WalletService } from "src/app/wallet/services/wallet.service";
import { StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { Safe } from "../../../safes/safe";
import { SignTransactionResult } from "../../../safes/safe.types";
import { WalletUtil } from "../../../wallet.util";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { EVMSafe } from "./evm.safe";

/**
 * Safe specialized for EVM networks, with additional methods.
 */
export class EVMWalletJSSafe extends Safe implements EVMSafe {
  private account = null;
  private evmAddress = null;
  private privateKey = null;
  private publicKey = null;

  constructor(protected masterWallet: StandardMasterWallet, protected chainId: number) {
    super(masterWallet);
  }

  public async initialize(networkWallet: AnyNetworkWallet): Promise<void> {
    await super.initialize(networkWallet);

    // Check if the address is already computed or not  (first time). If not, request the
    // master password to compute it
    this.evmAddress = await networkWallet.loadContextInfo("evmAddress");
    this.publicKey = await networkWallet.loadContextInfo("evmPublicKey");
    if (!this.evmAddress || !this.publicKey) {
      await this.initJSWallet()

      if (this.account) {
        this.evmAddress = this.account.address;
      }

      if (this.evmAddress)
        await networkWallet.saveContextInfo("evmAddress", this.evmAddress);

      if (this.publicKey)
        await networkWallet.saveContextInfo("evmPublicKey", this.publicKey);
    }
  }

  private async initJSWallet(password = null) {
    if (this.account) return;

    if (!password) {
      // No data - need to compute
      password = await AuthService.instance.getWalletPassword(this.masterWallet.id);
      if (!password)
        return; // Can't continue without the wallet password - cancel the initialization
    }

    let seed = await (this.masterWallet as StandardMasterWallet).getSeed(password);
    if (seed) {
      let jsWallet = await WalletUtil.getWalletFromSeed(seed);
      this.privateKey = jsWallet.privateKey;
    }
    else {
      // No mnemonic - check if we have a private key instead
      this.privateKey = await (this.masterWallet as StandardMasterWallet).getPrivateKey(password);
    }

    this.privateKey = this.privateKey.replace("0x", "");

    const secp256k1 = await import('secp256k1');
    // Get the compressed publickey.
    this.publicKey = Buffer.from(secp256k1.publicKeyCreate(Buffer.from(this.privateKey, "hex"), true)).toString("hex")

    if (this.privateKey) {
      this.account = (await EVMService.instance.getWeb3(this.networkWallet.network)).eth.accounts.privateKeyToAccount(this.privateKey);
    }
  }

  public getAddresses(startIndex: number, count: number, internalAddresses: boolean): string[] {
    return [this.evmAddress];
  }

  public getPublicKey(): string {
    return this.publicKey;
  }

  public createTransferTransaction(toAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any> {
    return EVMService.instance.createUnsignedTransferTransaction(toAddress, amount, gasPrice, gasLimit, nonce);
  }

  public createContractTransaction(contractAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number, data: any): Promise<any> {
    return EVMService.instance.createUnsignedContractTransaction(contractAddress, amount, gasPrice, gasLimit, nonce, data);
  }

  public async signDigest(address: string, digest: string, password: string): Promise<string> {
    if (!this.account) {
      await this.initJSWallet(password);
    }

    try {
      const msgSig = ecsign(Buffer.from(digest, "hex"), Buffer.from(this.privateKey, "hex"));
      const rawMsgSig = toRpcSig(msgSig.v, msgSig.r, msgSig.s);
      return rawMsgSig;
    }
    catch (e) {
      Logger.warn('wallet', 'signDigest exception ', e)
    }

    return null;
  }

  public async signTransaction(subWallet: AnySubWallet, rawTransaction: json, transfer: Transfer, forcePasswordPrompt = true, visualFeedback = true): Promise<SignTransactionResult> {
    Logger.log('wallet', ' signTransaction rawTransaction', rawTransaction)

    let payPassword: string;
    if (forcePasswordPrompt) {
      payPassword = await WalletService.instance.openPayModal(transfer);
    }
    else {
      payPassword = await AuthService.instance.getWalletPassword(this.masterWallet.id, true, false); // Don't force password
    }

    let signedTx = null;
    if (!payPassword)
      return { signedTransaction: signedTx };

    await this.initJSWallet();

    if (this.account) {
      let signdTransaction = await this.account.signTransaction(rawTransaction)
      signedTx = signdTransaction.rawTransaction;
    }
    return { signedTransaction: signedTx };
  }
}