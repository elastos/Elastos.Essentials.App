import { Logger } from "src/app/logger";
import { Outputs, UtxoForSDK } from "src/app/wallet/model/tx-providers/transaction.types";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { jsToSpvWalletId, PubKeyInfo, SPVService } from "src/app/wallet/services/spv.service";
import { SignTransactionResult } from "../../../../safes/safe.types";
import { SPVSDKSafe } from "../../../../safes/spvsdk.safe";
import { AnySubWallet } from "../../../base/subwallets/subwallet";
import { WalletJSSDKHelper } from "../../wallet.jssdk.helper";
import { ElastosMainChainSafe } from "./mainchain.safe";

export class MainChainSPVSDKSafe extends SPVSDKSafe implements ElastosMainChainSafe {
  public createPaymentTransaction(inputs: UtxoForSDK[], outputs: Outputs[], fee: string, memo: string) {
    return SPVService.instance.createTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId, // From subwallet id
      JSON.stringify(inputs),
      JSON.stringify(outputs),
      fee,
      memo
    );
  }

  public async signTransaction(subWallet: AnySubWallet, rawTransaction: string, transfer: Transfer): Promise<SignTransactionResult> {
    let txResult = await super.signTransaction(subWallet, rawTransaction, transfer);

    if (!txResult.signedTransaction)
      return txResult; // Forward the error

    // For mainchain, the signed created transaction is a json string.
    // We must convert it to a raw transaction first before publishing it.
    // So the real "sign transaction" format is the raw transaction

    // TODO: move this conversion to convertSignedTransactionToPublishableTransaction()

    let rawSignedTransaction = await SPVService.instance.convertToRawTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      txResult.signedTransaction);

    return {
      signedTransaction: rawSignedTransaction
    }
  }

  public getOwnerAddress(): Promise<string> {
    return SPVService.instance.getOwnerAddress(jsToSpvWalletId(this.masterWallet.id), this.chainId);
  }

  /**
   * -----
   * BIP45 WARNING
   * -----
   *
   * IMPORTANT NOTE:
   * - Historically, ELA mainchain wallets in the SPVSDK use BIP44 derivation which is a mistake, they should
   * use BIP45.
   * - ELA mainchain multisig implementation inside Essentials uses BIP45 as as such, they require signing wallets
   * to provide BIP45 xpubs.
   * - It was agreed with the elastos blockchain team that stopping to push this error (BIP44 legacy) was the best
   * thing to do.
   * - getExtendedPublicKey() is for now used only by multisig, so we use the seed to get the BIP45 xpub here,
   * not the BIP44 one that the native SPVSDK could return to us.
   */
  public async getExtendedPublicKey(): Promise<string> {
    try {
      await WalletJSSDKHelper.maybeCreateStandardWalletFromJSWallet(this.masterWallet);

      let sdkMasterWallet = await WalletJSSDKHelper.loadMasterWalletFromJSWallet(this.masterWallet);
      if (!sdkMasterWallet)
        return null;

      let pubKeyInfo = <PubKeyInfo>sdkMasterWallet.getPubKeyInfo();

      return pubKeyInfo.xPubKeyHDPM; // BIP45 !
    }
    catch (e) {
      Logger.error("wallet", "SPVSDK safe getExtendedPublicKey() error:", e);
    }
  }
}