import { Logger } from "src/app/logger";
import { AESDecrypt } from "src/app/wallet/model/crypto";
import { ElastosWalletNetworkOptions } from "src/app/wallet/model/wallet.types";
import { AuthService } from "src/app/wallet/services/auth.service";
import { SPVService } from "src/app/wallet/services/spv.service";
import { StandardNetworkWallet } from "../../../standardnetworkwallet";
import { WalletHelper } from "../../wallet.helper";

export abstract class ElastosStandardNetworkWallet extends StandardNetworkWallet<ElastosWalletNetworkOptions> {
  public async initialize(): Promise<void> {
    // Standard Elastos wallets depends on the SPVSDK. We lazily initialize wallets in the SPVSDK here
    // in case they are not.
    // We know that a JS wallet has its SPV SDK counterpart if there is a mapping between JS wallet ID
    // and SPV wallet ID in the SPV service.
    if (!await this.checkSPVWalletState())
      return;

    await super.initialize();
  }

  private async checkSPVWalletState(): Promise<boolean> {
    // If we find an existing mapping in the SPV service, nothing to do
    let spvMasterId = SPVService.instance.getSPVMasterID(this.masterWallet.id);
    console.log("checkSPVWalletState", this.masterWallet.id, spvMasterId)
    if (spvMasterId)
      return true; // Already initialized

    Logger.log("wallet", "Creating the SPV wallet counterpart for wallet ", this.masterWallet.id);

    let payPassword = await AuthService.instance.getWalletPassword(this.masterWallet.id);
    if (!payPassword)
      return false; // Can't continue without the wallet password - cancel the initialization

    // No SPV wallet matching this JS wallet yet. Import one, in a different way depending on how the JS wallet
    // was imported
    if (this.masterWallet.seed) {
      // Decrypt the seed
      let decryptedSeed = AESDecrypt(this.masterWallet.seed, payPassword);

      // Import the seed as new SPV SDK wallet
      let spvWalletId = WalletHelper.createSPVMasterWalletId();
      await SPVService.instance.importWalletWithSeed(
        spvWalletId,
        decryptedSeed,
        payPassword,
        this.getNetworkOptions().singleAddress,
        "",
        "");

      // Save the JS<->SPV wallet id mapping
      await SPVService.instance.setMasterWalletIDMapping(this.masterWallet.id, spvWalletId);
    }
    else {
      //TODO
      console.log("ELASTOS LAZY IMPORT BY PRIVATE KEY TODO");
    }

    return true;
  }
}