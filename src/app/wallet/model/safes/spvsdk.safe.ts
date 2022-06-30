import { Logger } from "src/app/logger";
import { AuthService } from "../../services/auth.service";
import { Transfer } from "../../services/cointransfer.service";
import { SPVHelperService } from "../../services/spv.helper.service";
import { jsToSpvWalletId, SPVService } from "../../services/spv.service";
import { WalletService } from "../../services/wallet.service";
import { StandardMasterWallet } from "../masterwallets/masterwallet";
import { AnyNetworkWallet } from "../networks/base/networkwallets/networkwallet";
import { AnySubWallet } from "../networks/base/subwallets/subwallet";
import { Safe } from "./safe";
import { SignTransactionErrorType, SignTransactionResult } from "./safe.types";

/**
 * Temporary safe to experiment the new architecture, and keep using SPVSDK commands.
 * Later on, SPVSDKSafes must be replaced with StandardSafes (signatures managed by essentials JS).
 */
export class SPVSDKSafe extends Safe {
  protected spvWalletId: string;

  constructor(protected masterWallet: StandardMasterWallet, protected chainId: string) {
    super(masterWallet);

    this.spvWalletId = jsToSpvWalletId(masterWallet.id);
  }

  public async initialize(networkWallet: AnyNetworkWallet): Promise<void> {
    // TODO: Stop using the SPVSDK for EVM network wallets
    if (!await SPVHelperService.maybeCreateStandardSPVWalletFromJSWallet(this.masterWallet))
      return;

    await super.initialize(networkWallet);
  }

  public getAddresses(startIndex: number, count: number, internalAddresses: boolean): Promise<string[]> {
    return SPVService.instance.getAddresses(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      startIndex,
      count,
      internalAddresses
    );
  }

  public async signTransaction(subWallet: AnySubWallet, rawTransaction: string, transfer: Transfer, forcePasswordPrompt = true, visualFeedback = true): Promise<SignTransactionResult> {
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

    Logger.log("wallet", "Password retrieved. Now signing the transaction with SPVSDK.");

    const signedTransaction = await SPVService.instance.signTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      rawTransaction.toString(),
      password
    );

    Logger.log("wallet", "signedTransaction:", signedTransaction)
    return { signedTransaction: signedTransaction };
  }
}