import { AuthService } from "src/app/identity/services/auth.service";
import { Logger } from "src/app/logger";
import { ElastosWalletNetworkOptions, MasterWalletInfo, PrivateKeyType, WalletCreator } from "src/app/wallet/model/wallet.types";
import { WalletCreateType } from "src/app/wallet/model/walletaccount";
import { AuthService as WalletAuthService } from "src/app/wallet/services/auth.service";
import { SPVService } from "src/app/wallet/services/spv.service";
import { LocalStorage } from "src/app/wallet/services/storage.service";
import { WalletService } from "src/app/wallet/services/wallet.service";
import { IdentityEntry } from "../../global.didsessions.service";

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

      let extendedInfo = await LocalStorage.instance.getExtendedMasterWalletInfo(spvWalletId);

      if (!extendedInfo) {
        Logger.warn("migrations", "No extended info found for wallet, not migrating!", spvWalletId);
        continue;
      }

      let jsWalletID = WalletService.instance.createMasterWalletID();

      // SURE ABOUT THAT?? WHY? We migrate only MNEMONIC and PRIVATEKEY wallets, not KEYSTORE ones
      // No "createType" means old wallets always mnemonic based.
      let creationType = extendedInfo.createType ? extendedInfo.createType : WalletCreateType.MNEMONIC;
      let spvAccountInfo = await spvService.getMasterWalletBasicInfo(spvWalletId);

      let elastosNetworkOptions: ElastosWalletNetworkOptions = {
        network: 'elastos', // Elastos main chain
        singleAddress: spvAccountInfo.SingleAddress || true
      };

      let walletInfo: MasterWalletInfo = {
        id: jsWalletID,
        name: extendedInfo.name,
        theme: {
          background: extendedInfo.theme.background,
          color: extendedInfo.theme.color
        },
        seed,
        mnemonic,
        hasPassphrase: spvAccountInfo.HasPassPhrase || false,
        networkOptions: [elastosNetworkOptions],
        creator: extendedInfo.createdBySystem ? WalletCreator.WALLET_APP : WalletCreator.USER
      };

      if (privateKey) {
        walletInfo.privateKey = privateKey;
        // All existing wallets imported by private key use EVM private keys.
        walletInfo.privateKeyType = PrivateKeyType.EVM;
      }

      let masterWallet = await WalletService.instance.createMasterWalletFromInfo(walletInfo);
      if (!masterWallet) {
        Logger.warn("Master wallet couldn't be created during migration, it won't appear in the list! Continuing anyway to get other wallets");
        continue;
      }

      // TODO: call wallet service to silently create a new JS wallet based on mnemonic / pkey
      //      -> remove duplicate createNewMasterWallet VS importWalletWithMnemonic
      // TODO: change wallet service to load master wallets from JS, not from SPVSDK
    }

    await spvService.destroy();
  }, () => {
    throw new Error("Master password not provided");
  }, true, false, identityEntry.didStoreId);
}