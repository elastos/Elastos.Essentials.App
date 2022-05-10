import { BrowserLocalStorage, MasterWallet as SDKMasterWallet, MasterWalletManager } from "@elastosfoundation/wallet-js-sdk";
import { Logger } from "src/app/logger";
import { GlobalDIDSessionsService } from "src/app/services/global.didsessions.service";
import { GlobalNetworksService, MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { AuthService } from "src/app/wallet/services/auth.service";
import { WalletService } from "src/app/wallet/services/wallet.service";
import { StandardMasterWallet } from "../../masterwallets/masterwallet";
import { StandardMultiSigMasterWallet } from "../../masterwallets/standard.multisig.masterwallet";
import { ElastosMainChainWalletNetworkOptions } from "../../masterwallets/wallet.types";
/**
 * Helper class to manage interactions with the Elastos Wallet JS SDK (@elastosfoundation/wallet-js-sdk).
 */
export class WalletJSSDKHelper {
  private static loadMasterWalletManager(): MasterWalletManager {
    const netType = GlobalNetworksService.instance.activeNetworkTemplate.value === MAINNET_TEMPLATE ? "MainNet" : "TestNet";
    const browserStorage = new BrowserLocalStorage(GlobalDIDSessionsService.signedInDIDString);
    const netConfig = { NetType: netType, ELA: {} };

    return new MasterWalletManager(
      browserStorage,
      netType,
      netConfig
    );
  }

  public static loadMasterWalletFromJSWallet(masterWallet: StandardMultiSigMasterWallet): SDKMasterWallet {
    let masterWalletManager = this.loadMasterWalletManager();
    return masterWalletManager.getMasterWallet(masterWallet.id);
  }

  public static async maybeCreateStandardMultiSigWalletFromJSWallet(masterWallet: StandardMultiSigMasterWallet): Promise<boolean> {
    Logger.log("wallet", "Creating Elastos Wallet JS SDK wallet entity for wallet ", masterWallet.id);

    let payPassword = await AuthService.instance.getWalletPassword(masterWallet.id);
    if (!payPassword)
      return false; // Can't continue without the wallet password - cancel the initialization

    let elastosNetworkOptions = masterWallet.getNetworkOptions("elastos") as ElastosMainChainWalletNetworkOptions;

    // TODO: remember wallet created in local storage to not run the below code every time

    console.log("masterWallet.signersExtPubKeys", masterWallet.signersExtPubKeys)

    let masterWalletManager = this.loadMasterWalletManager();

    // TMP TEST
    /* const passphrase = "";
    const payPassword = "11111111";
    const singleAddress = true;

    const masterWalletID = "master-wallet-id-4" + Math.random();
    const mnemonic = `cat become when turtle fluid floor various assault praise slice menu long`;
    const masterWalletTest = masterWalletManager.createMasterWallet(
      masterWalletID,
      mnemonic,
      passphrase,
      payPassword,
      singleAddress
    );

    const browserStorage = new BrowserLocalStorage(GlobalDIDSessionsService.signedInDIDString);
    const localStore = browserStorage.loadStore(masterWalletID);
    console.log("xPubKeyHDPM", localStore.xPubKeyHDPM as string)

 */

    let walletExists = masterWalletManager.getAllMasterWalletID().indexOf(masterWallet.id) >= 0;
    //let existingWallet = masterWalletManager.getMasterWallet(masterWallet.id);
    if (walletExists) {
      // Wallet already exists, do nothing
      return true;
    }

    // Get user's signing wallet to add its mnemonic/private key to the multisig wallet for future
    // signatures.
    let signingWallet = WalletService.instance.getMasterWallet(masterWallet.signingWalletId);
    if (!signingWallet) {
      Logger.error("wallet", `Unable to create multi signature network wallet. Signing wallet with ID ${masterWallet.signingWalletId} cannot be found`);
      return false;
    }

    if (!(signingWallet instanceof StandardMasterWallet) || !signingWallet.getSeed()) {
      Logger.error("wallet", "Elastos mainchain multisig wallet can only use standard wallets with mnemonics for now");
      return false;
    }

    let signingWalletPayPassword = await AuthService.instance.getWalletPassword(signingWallet.id);
    if (!signingWalletPayPassword)
      return false; // Can't continue without the signing wallet password - cancel the initialization

    if (signingWallet.getSeed(signingWalletPayPassword)) {
      const sdkMasterWallet = masterWalletManager.createMultiSignMasterWalletWithMnemonic(
        masterWallet.id,
        signingWallet.getMnemonic(signingWalletPayPassword), // TODO: Wrong, need a "create multisig from seed" method without passphrase
        "", // TODO: Wrong, need a "create multisig from seed" method without passphrase
        payPassword, // Multisig pay password, not signing wallet
        masterWallet.signersExtPubKeys,
        masterWallet.requiredSigners,
        elastosNetworkOptions.singleAddress
      );

      const elaSubWallet = sdkMasterWallet.createSubWallet("ELA");

      return true;
    }
    else {
      // NOTE: private key wallets not supported. Already checked above.
      return false;
    }

    // No SDK wallet matching this EE wallet yet. Import one, in a different way depending on how the JS wallet
    // was imported
    /*  if (masterWallet.getSeed()) {
         // Decrypt the seed
         let decryptedSeed = AESDecrypt(masterWallet.getSeed(), payPassword);

         let elastosNetworkOptions = masterWallet.getNetworkOptions("elastos") as ElastosMainChainWalletNetworkOptions;

         // Import the seed as new SPV SDK wallet
         let spvWalletId = WalletHelper.createSPVMasterWalletId();
         await SPVService.instance.importWalletWithSeed(
             spvWalletId,
             decryptedSeed,
             payPassword,
             elastosNetworkOptions.singleAddress, // This is an info set in the "elastos" (mainchain) network options
             "",
             "");

         // Save the JS<->SPV wallet id mapping
         await SPVService.instance.setMasterWalletIDMapping(masterWallet.id, spvWalletId);
     }
     else {
         // Decrypt the private key
         let descryptedPrivateKey = AESDecrypt(masterWallet.getPrivateKey(), payPassword);

         // Import the seed as new SPV SDK wallet
         let spvWalletId = WalletHelper.createSPVMasterWalletId();
         await SPVService.instance.createMasterWalletWithPrivKey(
             spvWalletId,
             descryptedPrivateKey,
             payPassword);

         // Save the JS<->SPV wallet id mapping
         await SPVService.instance.setMasterWalletIDMapping(masterWallet.id, spvWalletId);
     } */

    return await true;
  }
}