import { MainchainSubWallet as SDKMainchainSubWallet, MasterWallet as SDKMasterWallet } from "@elastosfoundation/wallet-js-sdk";
import BIP32Factory from 'bip32';
import moment from "moment";
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

  public async signTransaction(subWallet: AnySubWallet, rawTx: string, transfer: Transfer): Promise<SignTransactionResult> {

    // DEBUG
    await OfflineTransactionsService.instance.debugRemoveTransactions(subWallet);

    let offlineTransaction: OfflineTransaction<any> = {
      id: `${Math.random()}`,
      type: OfflineTransactionType.MULTI_SIG_STANDARD,
      updated: moment().unix(),
      rawTx,
      customData: {}
    };
    await OfflineTransactionsService.instance.storeTransaction(subWallet, offlineTransaction);

    let params: CoinTxInfoParams = {
      masterWalletId: this.networkWallet.id,
      subWalletId: subWallet.id,
      offlineTransaction
    };
    Native.instance.go("/wallet/coin-tx-info", params);

    return {
      errorType: SignTransactionErrorType.DELEGATED
    };

    //throw new Error("Method not implemented.");
  }

  public async signTransactionReal(subWallet: AnySubWallet, rawTx: any): Promise<SignTransactionResult> {
    let payPassword = await AuthService.instance.getWalletPassword(this.masterWallet.id);
    if (!payPassword) {
      return {
        errorType: SignTransactionErrorType.CANCELLED
      }; // Can't continue without the wallet password
    }

    let signedTx = await this.elaSubWallet.signTransaction(rawTx, payPassword);
    console.log("multisig signTransactionReal signedTx", signedTx);

    let signedInfo = this.elaSubWallet.getTransactionSignedInfo(rawTx);
    console.log("signedInfo RAW", signedInfo);

    let signedInfo2 = this.elaSubWallet.getTransactionSignedInfo(signedTx as any);
    console.log("signedInfo SIGNED", signedInfo2);

    let backToRaw = this.elaSubWallet.convertToRawTransaction(signedInfo[0] as any);
    console.log("backToRaw", backToRaw)

    return {
      signedTransaction: JSON.stringify(signedTx)
    }
  }
}