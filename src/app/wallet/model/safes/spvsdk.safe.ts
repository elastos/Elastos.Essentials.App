import { Logger } from "src/app/logger";
import { Transfer } from "../../services/cointransfer.service";
import { jsToSpvWalletId, SPVService } from "../../services/spv.service";
import { WalletService } from "../../services/wallet.service";
import { StandardMasterWallet } from "../masterwallets/masterwallet";
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

  public async initialize(): Promise<void> {
    // TODO: Stop using the SPVSDK for EVM network wallets
    if (!await SPVService.instance.maybeCreateStandardSPVWalletFromJSWallet(this.masterWallet))
      return;

    await super.initialize();
  }

  public getAddresses(): Promise<string[]> {
    throw new Error("Method not implemented.");
  }

  public async signTransaction(rawTransaction: string, transfer: Transfer): Promise<SignTransactionResult> {
    const password = await WalletService.instance.openPayModal(transfer);
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

    return { signedTransaction };
  }
}