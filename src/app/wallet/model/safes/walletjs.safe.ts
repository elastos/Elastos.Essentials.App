import type { json, MasterWallet, SubWallet } from "@elastosfoundation/wallet-js-sdk";
import { Logger } from "src/app/logger";
import { AuthService } from "../../services/auth.service";
import { Transfer } from "../../services/cointransfer.service";
import { WalletService } from "../../services/wallet.service";
import { StandardMasterWallet } from "../masterwallets/masterwallet";
import { AnyNetworkWallet } from "../networks/base/networkwallets/networkwallet";
import { AnySubWallet } from "../networks/base/subwallets/subwallet";
import { WalletJSSDKHelper } from "../networks/elastos/wallet.jssdk.helper";
import { Safe } from "./safe";
import { SignTransactionErrorType, SignTransactionResult } from "./safe.types";

export class WalletJSSafe extends Safe {
  protected sdkMasterWallet: MasterWallet = null;
  protected sdkSubWallet: SubWallet = null;

  constructor(protected masterWallet: StandardMasterWallet, protected chainId: string) {
    super(masterWallet);
  }

  public async initialize(networkWallet: AnyNetworkWallet): Promise<void> {
    if (!await WalletJSSDKHelper.maybeCreateStandardWalletFromJSWallet(this.masterWallet))
      return;

    this.sdkMasterWallet = await WalletJSSDKHelper.getMasterWallet(this.masterWallet.id);
    this.sdkSubWallet = await <SubWallet>this.sdkMasterWallet.getSubWallet(this.chainId);

    await super.initialize(networkWallet);
  }

  public getAddresses(startIndex: number, count: number, internalAddresses: boolean): string[] {
    return <string[]>this.sdkSubWallet.getAddresses(
      startIndex,
      count,
      internalAddresses
    );
  }

  public async signTransaction(subWallet: AnySubWallet, rawTransaction: json, transfer: Transfer, forcePasswordPrompt = true, visualFeedback = true): Promise<SignTransactionResult> {
    let password: string;
    if (forcePasswordPrompt) {
      password = await WalletService.instance.openPayModal(transfer);
    }
    else {
      password = await AuthService.instance.getWalletPassword(transfer.masterWalletId, true, false); // Don't force password
      transfer.payPassword = password;
    }

    if (!password) {
      Logger.log("wallet", "No password received. Cancelling");
      return {
        errorType: SignTransactionErrorType.CANCELLED
      };
    }

    Logger.log("wallet", "Password retrieved. Now signing the transaction with JSSDK.");

    const signedTransaction = await this.sdkSubWallet.signTransaction(
      rawTransaction,
      password
    );

    Logger.log("wallet", "signedTransaction:", signedTransaction)
    return { signedTransaction: signedTransaction };
  }
}