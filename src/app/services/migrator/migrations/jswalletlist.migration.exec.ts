import { AuthService } from "src/app/identity/services/auth.service";
import { Logger } from "src/app/logger";
import { AESEncrypt } from "src/app/wallet/model/crypto";
import { ElastosWalletNetworkOptions, PrivateKeyType, SerializedStandardMasterWallet, WalletCreator, WalletType } from "src/app/wallet/model/wallet.types";
import { defaultWalletName, defaultWalletTheme } from "src/app/wallet/model/wallets/masterwallet";
import { AuthService as WalletAuthService } from "src/app/wallet/services/auth.service";
import { SPVService } from "src/app/wallet/services/spv.service";
import { WalletService } from "src/app/wallet/services/wallet.service";
import { GlobalDIDSessionsService, IdentityEntry } from "../../global.didsessions.service";
import { GlobalStorageService } from "../../global.storage.service";

/**
 * Find the first possible EVM subwallet in a master wallet, if any.
 */
const findEVMSubWalletId = async (spvBridge: SPVService, spvWalletId: string): Promise<string> => {
  let subWalletsIds = await spvBridge.getAllSubWallets(spvWalletId);
  for (let subWalletId of subWalletsIds) {
    if (subWalletId.startsWith("ETH"))
      return subWalletId;
  }
  return null;
}

/**
 * STEP 1:
 * - Keep using the SPVSDK for everything.
 * - BUT get ready to stop using it WITHOUT further migration later (so we need all info about the wallet in JS)
 * - Create the SPVSDK wallets on demand: when creating a networkwallet, if the spv wallet doesn't exist, create it based on JS info (seed+mnemonic or private key, + single address)
 *
 * STEP 2:
 * - replace MOST calls (except voting) to SPVSDK with JS code - no migration required hopefully. All based on the seed
 */
export const migrate = async (identityEntry: IdentityEntry): Promise<void> => {
  // Make sure user unlocks the master password, or throw a fatal error.
  await AuthService.instance.checkPasswordThenExecute(async () => {
    // Create and init the spv bridge helper
    let spvService = new SPVService(null, null, null);
    let rootPath = identityEntry.didStoragePath;
    await spvService.init(rootPath);

    // Get all master wallets
    let masterWallets = await spvService.getAllMasterWallets();

    Logger.log("migrations", `Found ${masterWallets.length} SPV wallets to migrate`);
    for (let spvWalletId of masterWallets) {
      // Make sure that the wallet has not yet been migrated in case or error during a previous attempt
      let existingJsWalletId = spvService.getJSMasterID(spvWalletId);
      if (existingJsWalletId) {
        Logger.log("migrations", `JS wallet ID ${existingJsWalletId} already bound to SPV wallet ID ${spvWalletId}. Not migrating`);
        continue;
      }

      let payPassword = await WalletAuthService.instance.getWalletPassword(spvWalletId);

      let mnemonic = await spvService.exportWalletWithMnemonic(spvWalletId, payPassword);
      let seed = await spvService.exportWalletWithSeed(spvWalletId, payPassword);

      let privateKey: string = null;
      if (!seed) {
        // No seed - try to gt the private key
        let subWalletId = await findEVMSubWalletId(spvService, spvWalletId);
        if (subWalletId)
          privateKey = await spvService.exportETHSCPrivateKey(spvWalletId, subWalletId, payPassword);
      }

      let legacyExtendedWalletInfoKey = "extended-wallet-infos-" + spvWalletId;
      let rawExtendedInfo = await GlobalStorageService.instance.getSetting(GlobalDIDSessionsService.signedInDIDString, "wallet", legacyExtendedWalletInfoKey, null);

      if (!rawExtendedInfo) {
        Logger.warn("migrations", "No extended info found for wallet, not migrating!", spvWalletId);
        continue;
      }

      let extendedInfo = JSON.parse(rawExtendedInfo);

      Logger.log("migrations", "Existing extended infos:", extendedInfo);

      let jsWalletID = WalletService.instance.createMasterWalletID();

      let spvAccountInfo = await spvService.getMasterWalletBasicInfo(spvWalletId);

      let elastosNetworkOptions: ElastosWalletNetworkOptions = {
        network: 'elastos', // Elastos main chain
        singleAddress: spvAccountInfo.SingleAddress || true
      };

      let walletInfo: SerializedStandardMasterWallet = {
        type: WalletType.STANDARD,
        id: jsWalletID,
        name: extendedInfo ? extendedInfo.name : defaultWalletName(),
        theme: extendedInfo && extendedInfo.theme ? {
          background: extendedInfo.theme.background,
          color: extendedInfo.theme.color
        } : defaultWalletTheme(),
        hasPassphrase: spvAccountInfo.HasPassPhrase || false,
        networkOptions: [elastosNetworkOptions],
        creator: extendedInfo && extendedInfo.createdBySystem ? WalletCreator.WALLET_APP : WalletCreator.USER
      };

      if (seed)
        walletInfo.seed = AESEncrypt(seed, payPassword);

      if (mnemonic)
        walletInfo.mnemonic = AESEncrypt(mnemonic, payPassword);

      if (privateKey) {
        walletInfo.privateKey = AESEncrypt(privateKey, payPassword);
        // All existing wallets imported by private key use EVM private keys.
        walletInfo.privateKeyType = PrivateKeyType.EVM;
      }

      // Save the link between the new JS wallet ID and the existing SPV wallet ID
      await spvService.setMasterWalletIDMapping(jsWalletID, spvWalletId);

      // Add wallet to the new JS model.
      let masterWallet = await WalletService.instance.createMasterWalletFromSerializedInfo(walletInfo, false);
      if (!masterWallet) {
        Logger.warn("Master wallet couldn't be created during migration, it won't appear in the list! Continuing anyway to get other wallets");
        continue;
      }
    }

    await spvService.destroy();
  }, () => {
    throw new Error("Master password not provided");
  }, true, false, identityEntry.didStoreId);
}