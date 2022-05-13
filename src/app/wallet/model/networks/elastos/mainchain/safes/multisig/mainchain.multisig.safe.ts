import { MainchainSubWallet as SDKMainchainSubWallet, MasterWallet as SDKMasterWallet, WalletErrorException } from "@elastosfoundation/wallet-js-sdk";
import BIP32Factory from 'bip32';
import moment from "moment";
import { md5 } from "src/app/helpers/crypto/md5";
import { Logger } from "src/app/logger";
import { JSONObject } from "src/app/model/json";
import { StandardMultiSigMasterWallet } from "src/app/wallet/model/masterwallets/standard.multisig.masterwallet";
import { MultiSigSafe } from "src/app/wallet/model/safes/multisig.safe";
import { SignTransactionErrorType, SignTransactionResult } from 'src/app/wallet/model/safes/safe.types';
import { OfflineTransaction, OfflineTransactionType, Outputs, UtxoForSDK } from 'src/app/wallet/model/tx-providers/transaction.types';
import { CoinTxInfoParams } from "src/app/wallet/pages/wallet/coin/coin-tx-info/coin-tx-info.page";
import { AuthService } from "src/app/wallet/services/auth.service";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { OfflineTransactionsService } from "src/app/wallet/services/offlinetransactions.service";
import * as ecc from 'tiny-secp256k1';
import { Native } from "../../../../../../services/native.service";
import { Safe } from "../../../../../safes/safe";
import { AnyNetworkWallet } from '../../../../base/networkwallets/networkwallet';
import { AnySubWallet } from "../../../../base/subwallets/subwallet";
import { WalletJSSDKHelper } from '../../../wallet.jssdk.helper';
import { ElastosMainChainSafe } from '../mainchain.safe';

const bip32 = BIP32Factory(ecc);

export class MainChainMultiSigSafe extends Safe implements ElastosMainChainSafe, MultiSigSafe {
  private sdkMasterWallet: SDKMasterWallet = null;
  private elaSubWallet: SDKMainchainSubWallet = null;

  constructor(protected masterWallet: StandardMultiSigMasterWallet) {
    super(masterWallet);
  }

  public async initialize(networkWallet: AnyNetworkWallet): Promise<void> {
    if (!await WalletJSSDKHelper.maybeCreateStandardMultiSigWalletFromJSWallet(this.masterWallet))
      return;

    this.sdkMasterWallet = WalletJSSDKHelper.loadMasterWalletFromJSWallet(this.masterWallet);
    this.elaSubWallet = <SDKMainchainSubWallet>this.sdkMasterWallet.getSubWallet("ELA");

    return super.initialize(networkWallet);
  }

  public async getAddresses(startIndex: number, count: number, internalAddresses: boolean): Promise<string[]> {
    return await <string[]>this.elaSubWallet.getAddresses(startIndex, count, internalAddresses);
  }

  public async getOwnerAddress(): Promise<string> {
    return await null; // Not supported by multisig wallets.
  }

  public async createPaymentTransaction(inputs: UtxoForSDK[], outputs: Outputs[], fee: string, memo: string): Promise<any> {
    const tx = this.elaSubWallet.createTransaction(inputs, outputs, fee, memo);
    console.log("multisig tx", tx);

    /**
        * TODO:
        * - offline tx service -> one cache per wallet id/subwallet id -> any kind of typed TX
           tx providers can choose to merge those txs
           safe saves to this service

           -> who can delete ? the tx provider itself, finds existing real txs, if matches an offline tx, it deletes it
        */

    return await tx;
  }

  public async signTransaction(subWallet: AnySubWallet, rawTx: JSONObject, transfer: Transfer): Promise<SignTransactionResult> {

    // DEBUG
    await OfflineTransactionsService.instance.debugRemoveTransactions(subWallet);

    // Transaction key is a md5 of the raw transaction.
    let transactionKey = md5(Buffer.from(JSON.stringify(rawTx)));
    console.log("signTransaction transactionKey", transactionKey)

    console.log("signTransaction", rawTx)

    let offlineTransaction: OfflineTransaction<any> = {
      transactionKey,
      type: OfflineTransactionType.MULTI_SIG_STANDARD,
      updated: moment().unix(),
      rawTx
    };
    await OfflineTransactionsService.instance.storeTransaction(subWallet, offlineTransaction);

    Logger.log("wallet", "Multisig safe created an initial offline transaction:", offlineTransaction);

    let params: CoinTxInfoParams = {
      masterWalletId: this.networkWallet.id,
      subWalletId: subWallet.id,
      offlineTransaction
    };
    Native.instance.go("/wallet/coin-tx-info", params);

    return {
      errorType: SignTransactionErrorType.DELEGATED
    };
  }

  public async hasCosignerSigned(xpub: string, tx: any): Promise<boolean> {
    let signers = this.elaSubWallet.getPublicKeysFromxPubKeys(tx, (<StandardMultiSigMasterWallet>this.masterWallet).signersExtPubKeys, false);
    let matchingCosigner = signers.find(s => s.xPubKey === xpub);
    if (!matchingCosigner)
      return false; // Should not happen

    return await matchingCosigner.signed;
  }

  public async convertSignedTransactionToPublishableTransaction(subWallet: AnySubWallet, signedTx: string): Promise<string> {
    return await this.elaSubWallet.convertToRawTransaction(JSON.parse(signedTx));
  }

  public async signTransactionReal(subWallet: AnySubWallet, rawTx: any): Promise<SignTransactionResult> {
    let payPassword = await AuthService.instance.getWalletPassword(this.masterWallet.id);
    if (!payPassword) {
      return {
        errorType: SignTransactionErrorType.CANCELLED
      }; // Can't continue without the wallet password
    }

    try {
      let signedTx = await this.elaSubWallet.signTransaction(rawTx, payPassword);
      Logger.log("wallet", "Multisig safe transaction signature result:", signedTx);
      return {
        signedTransaction: JSON.stringify(signedTx)
      }
    }
    catch (e) {
      if (e instanceof WalletErrorException && e.code === 20046) { // AlreadySigned
        Logger.warn("wallet", "Transaction was already signed, returning the original transaction as 'signed'", rawTx);
        return {
          signedTransaction: JSON.stringify(rawTx)
        }
      }
      else {
        return {
          errorType: SignTransactionErrorType.FAILURE
        }
      }
    }
  }

  public async hasEnoughSignaturesToPublish(signedTx: any): Promise<boolean> {
    try {
      // TODO: getTransactionSignedInfo() RETURNED ARRAY IS MAYBE NOT THE NB OF SIGNERS!
      let signers = this.elaSubWallet.getTransactionSignedInfo(signedTx);
      return signers.length >= (<StandardMultiSigMasterWallet>this.masterWallet).requiredSigners;
    }
    catch (e) {
      Logger.error("wallet", "Multisig safe hasEnoughSignaturesToPublish() error:", e);
      return await false;
    }
  }
}