import { AuthService } from "src/app/identity/services/auth.service";
import { Logger } from "src/app/logger";
import { SPVWalletPluginBridge } from "src/app/wallet/model/SPVWalletPluginBridge";
import { AuthService as WalletAuthService } from "src/app/wallet/services/auth.service";
import { IdentityEntry } from "../../global.didsessions.service";

export const migrate = async (identityEntry: IdentityEntry): Promise<void> => {
  // Make sure user unlocks the master password, or throw a fatal error.
  await AuthService.instance.checkPasswordThenExecute(async () => {
    // Create and init the spv bridge helper
    let spvBridge = new SPVWalletPluginBridge(null, null, null);
    let rootPath = identityEntry.didStoragePath;
    await spvBridge.init(rootPath);

    // Get all master wallets
    let masterWallets = await spvBridge.getAllMasterWallets();

    Logger.log("migrations", `Found ${masterWallets.length} SPV wallets to migrate`);
    for (let walletId of masterWallets) {
      let payPassword = await WalletAuthService.instance.getWalletPassword(walletId);
      let mnemonic = await spvBridge.exportWalletWithMnemonic(walletId, payPassword);

      // TODO: problem: how to find single or multi address for elastos config?
      // TODO: call wallet service to silently create a new JS wallet based on mnemonic / pkey
    }

    //spvBridge.exportETHSCPrivateKey
    //spvBridge.exportWalletWithMnemonic(walletId, payPassword);

    await spvBridge.destroy();
  }, () => {
    throw new Error("Master password not provided");
  }, true, false, identityEntry.didStoreId);
}