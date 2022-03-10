import { AESEncrypt } from "src/app/helpers/crypto/aes";
import { AuthService } from "src/app/identity/services/auth.service";
import { Logger } from "src/app/logger";
import { defaultWalletName, defaultWalletTheme } from "src/app/wallet/model/masterwallets/masterwallet";
import { ElastosMainChainWalletNetworkOptions, PrivateKeyType, SerializedStandardMasterWallet, WalletCreator, WalletType } from "src/app/wallet/model/masterwallets/wallet.types";
import { AuthService as WalletAuthService } from "src/app/wallet/services/auth.service";
import { SPVService } from "src/app/wallet/services/spv.service";
import { WalletService } from "src/app/wallet/services/wallet.service";
import type { IdentityEntry } from "../../global.didsessions.service";
import { GlobalDIDSessionsService } from "../../global.didsessions.service";
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

const seedExists = (seed: string): boolean => {
  return !!seed && seed !== '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
}

export const migrateSPVNetworkTemplate = async (networkTemplate: string, identityEntry: IdentityEntry): Promise<void> => {
  // Force reset the wallet service master wallets list in case it was previously populated
  // by another network template process.
  WalletService.instance.clearMasterWalletsList();

  // Create and init the spv bridge helper
  let spvService = new SPVService(null, null, null);

  let spvNetworkTemplate = "";
  switch (networkTemplate) {
    case "LRW":
      spvNetworkTemplate = "PrvNet";
      break;
    default:
      spvNetworkTemplate = networkTemplate;
  }

  //PrvNet MainNet TestNet
  await spvService.setNetwork(spvNetworkTemplate, "{}");

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
    if (!payPassword) {
      Logger.log("migrations", `No pay password found for SPV wallet ID ${spvWalletId}. This wallet was probably created after the migration, by a JS wallet. Skipping`);
      continue;
    }

    let mnemonic = await spvService.exportWalletWithMnemonic(spvWalletId, payPassword);
    let seed = await spvService.exportWalletWithSeed(spvWalletId, payPassword);

    let privateKey: string = null;
    if (!seedExists(seed)) {
      // Reset the strange 00000 seed to null to not save anything
      seed = null;

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

    // Create a JS wallet ID
    let jsWalletID = WalletService.instance.createMasterWalletID();

    // Save a new password entry for the JS wallet payment password for this new wallet (same as the SPV one)
    await WalletAuthService.instance.saveWalletPassword(jsWalletID, payPassword);

    let spvAccountInfo = await spvService.getMasterWalletBasicInfo(spvWalletId);

    let elastosNetworkOptions: ElastosMainChainWalletNetworkOptions = {
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
    let masterWallet = await WalletService.instance.createMasterWalletFromSerializedInfo(walletInfo, false, networkTemplate);
    if (!masterWallet) {
      Logger.warn("migrations", "Master wallet couldn't be created during migration, it won't appear in the list! Continuing anyway to get other wallets");
      continue;
    }
  }

  await spvService.destroy();
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
    await migrateSPVNetworkTemplate("MainNet", identityEntry);
    await migrateSPVNetworkTemplate("TestNet", identityEntry);
    await migrateSPVNetworkTemplate("LRW", identityEntry);
  }, () => {
    throw new Error("Master password not provided");
  }, true, false, identityEntry.didStoreId);
}

export const debugClearMigrationState = async (identityEntry: IdentityEntry): Promise<void> => {
  let spvService = new SPVService(null, null, null);

  await spvService.debugResetMasterWalletIDMapping();

  await spvService.destroy();
}