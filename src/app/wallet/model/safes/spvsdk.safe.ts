import { LedgerSafe } from "src/app/wallet/model/safes/ledger.safe";
import { jsToSpvWalletId, SPVService } from "../../services/spv.service";
import { StandardMasterWallet } from "../masterwallets/masterwallet";

/**
 * Temporary safe to experiment the new architecture, and keep using SPVSDK commands.
 * Later on, SPVSDKSafes must be replaced with StandardSafes (signatures managed by essentials JS).
 */
export class SPVSDKSafe extends LedgerSafe {
  protected spvWalletId: string;

  constructor(private masterWallet: StandardMasterWallet, private chainId: string) {
    super();

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

  public async signTransaction(rawTransaction: Buffer): Promise<string> {
    const signedTx = await SPVService.instance.signTransaction(
      this.spvWalletId,
      this.chainId,
      rawTransaction.toString(), // TODO - IMPORTANT - is this byte-safe to convert buffer to string ?
      "password" // TODO: GET REAL PAY PASSWORD - BUT ONLY FOR SOFTWARE SAFE, NOT LEDGER - USE A CALLBACK in constructor to get missing pwd?
    );
    return signedTx;
  }
}