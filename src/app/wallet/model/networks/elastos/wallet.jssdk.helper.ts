import type { MasterWallet as SDKMasterWallet, MasterWalletManager } from "@elastosfoundation/wallet-js-sdk";
import moment from "moment";
import { lazyElastosWalletSDKImport } from "src/app/helpers/import.helper";
import { Logger } from "src/app/logger";
import { GlobalNetworksService } from "src/app/services/global.networks.service";
import { AuthService } from "src/app/wallet/services/auth.service";
import { WalletService } from "src/app/wallet/services/wallet.service";
import { MasterWallet, StandardMasterWallet } from "../../masterwallets/masterwallet";
import { StandardMultiSigMasterWallet } from "../../masterwallets/standard.multisig.masterwallet";
import { ElastosMainChainWalletNetworkOptions } from "../../masterwallets/wallet.types";
import { DIDSessionsStore } from './../../../../services/stores/didsessions.store';
import { JSSDKLocalStorage } from "./localstorage.jssdk";

/**
 * Helper class to manage interactions with the Elastos Wallet JS SDK (@elastosfoundation/wallet-js-sdk).
 */
export class WalletJSSDKHelper {
  private static masterWalletManager: MasterWalletManager = null;

  public static async loadMasterWalletManager(): Promise<MasterWalletManager> {
    if (this.masterWalletManager) return this.masterWalletManager;

    let networkTemplate = await GlobalNetworksService.instance.getActiveNetworkTemplate();
    if (networkTemplate === "LRW") {
      networkTemplate = "PrvNet";
    }

    const browserStorage = new JSSDKLocalStorage(DIDSessionsStore.signedInDIDString);
    const netConfig = { NetType: networkTemplate, ELA: {} };

    const { MasterWalletManager } = await lazyElastosWalletSDKImport();
    this.masterWalletManager = await MasterWalletManager.create(
      browserStorage,
      networkTemplate,
      netConfig
    );
    return this.masterWalletManager;
  }

  public static async loadMasterWalletFromJSWallet(masterWallet: MasterWallet): Promise<SDKMasterWallet> {
    return await this.masterWalletManager.getMasterWallet(masterWallet.id);
  }

  public static resetMasterWalletManager() {
    if (this.masterWalletManager) {
      this.masterWalletManager.destroy();
      this.masterWalletManager = null;
    }
  }

  public static generateMnemonic(language: string) {
    return this.masterWalletManager.generateMnemonic(language);
  }

  public static async maybeCreateStandardWalletFromJSWallet(masterWallet: StandardMasterWallet): Promise<boolean> {
    Logger.warn("wallet", "Creating Elastos Wallet JS SDK wallet entity for standard wallet ", masterWallet.id);

    let elastosNetworkOptions = masterWallet.getNetworkOptions("elastos") as ElastosMainChainWalletNetworkOptions;
    let walletExists = this.masterWalletManager.getAllMasterWalletID().indexOf(masterWallet.id) >= 0;
    if (walletExists) {
      // Wallet already exists, do nothing
      Logger.log("wallet", "Wallet already exists, do nothing");
      return true;
    }

    // EVM wallet imported by private key.
    if (!masterWallet.hasMnemonicSupport()) return true;

    let payPassword = await AuthService.instance.getWalletPassword(masterWallet.id);
    if (!payPassword)
      return false; // Can't continue without the wallet password - cancel the initialization

    let seed = await masterWallet.getSeed(payPassword);
    if (!seed) {
      Logger.error("wallet", "Elastos mainchain standard wallet can only be created from seed for now");
      return false;
    }

    const sdkMasterWallet = await this.masterWalletManager.importWalletWithSeed(
      masterWallet.id,
      seed,
      payPassword, // Multisig pay password, not signing wallet
      elastosNetworkOptions.singleAddress,
      "",
      ""
    );

    await sdkMasterWallet.createSubWallet("ELA");

    return true;
  }

  public static async maybeCreateStandardMultiSigWalletFromJSWallet(masterWallet: StandardMultiSigMasterWallet): Promise<boolean> {
    Logger.log("wallet", "Creating Elastos Wallet JS SDK wallet entity for multisig wallet ", masterWallet.id);

    let elastosNetworkOptions = masterWallet.getNetworkOptions("elastos") as ElastosMainChainWalletNetworkOptions;

    console.log("masterWallet.signersExtPubKeys", masterWallet.signersExtPubKeys)

    let walletExists = this.masterWalletManager.getAllMasterWalletID().indexOf(masterWallet.id) >= 0;
    //let existingWallet = await this.masterWalletManager.getMasterWallet(masterWallet.id);
    if (walletExists) {
      // Wallet already exists, do nothing
      return true;
    }

    let payPassword = await AuthService.instance.getWalletPassword(masterWallet.id);
    if (!payPassword)
      return false; // Can't continue without the wallet password - cancel the initialization
    // Get user's signing wallet to add its mnemonic/private key to the multisig wallet for future
    // signatures.
    let signingWallet = WalletService.instance.getMasterWallet(masterWallet.signingWalletId);
    if (!signingWallet) {
      Logger.error("wallet", `Unable to create multi signature network wallet. Signing wallet with ID ${masterWallet.signingWalletId} cannot be found`);
      return false;
    }

    if (!(signingWallet instanceof StandardMasterWallet) || !await signingWallet.getSeed()) {
      Logger.error("wallet", "Elastos mainchain multisig wallet can only use standard wallets with mnemonics for now");
      return false;
    }

    let signingWalletPayPassword = await AuthService.instance.getWalletPassword(signingWallet.id);
    if (!signingWalletPayPassword)
      return false; // Can't continue without the signing wallet password - cancel the initialization

    let seed = await signingWallet.getSeed(signingWalletPayPassword);

    if (await signingWallet.getSeed(signingWalletPayPassword)) {
      const sdkMasterWallet = await this.masterWalletManager.createMultiSignMasterWalletWithSeed(
        masterWallet.id,
        seed,
        payPassword, // Multisig pay password, not signing wallet
        masterWallet.signersExtPubKeys,
        masterWallet.requiredSigners,
        elastosNetworkOptions.singleAddress
      );

      await sdkMasterWallet.createSubWallet("ELA");

      return true;
    }
    else {
      // NOTE: private key wallets not supported. Already checked above.
      return false;
    }
  }

  public static async importWalletWithMnemonic(masterWalletId: string,
    mnemonic: string,
    phrasePassword: string,
    payPassword,
    singleAddress: boolean) {
    return await this.masterWalletManager.importWalletWithMnemonic(masterWalletId, mnemonic, phrasePassword, payPassword, singleAddress, moment().valueOf());
  }

  public static async exportWalletWithMnemonic(masterWalletId: string, payPassWord: string) {
    return (await this.getMasterWallet(masterWalletId)).exportMnemonic(payPassWord);
  }

  //   public static async exportWalletWithSeed(masterWalletId: string, payPassWord: string) {
  //     return (await this.getMasterWallet(masterWalletId)).exportSeed(payPassWord);
  //   }

  public static async exportKeystore(masterWalletId: string, backupPassword: string, payPassword: string) {
    let masterWallet = await this.getMasterWallet(masterWalletId);
    return await masterWallet.exportKeystore(backupPassword, payPassword);
  }

  public static async createSubWallet(masterWalletId, subwalletId) {
    return (await this.getMasterWallet(masterWalletId)).createSubWallet(subwalletId);
  }

  public static async destroySubWallet(masterWalletId, subWalletId) {
    let masterWallet = await this.getMasterWallet(masterWalletId);
    if (masterWallet) {
      await masterWallet.destroyWallet(subWalletId);
    }
  }

  public static async destroyWallet(masterWalletId) {
    Logger.log('wallet', 'WalletJSSDKHelper destroyWallet', masterWalletId);
    return await this.masterWalletManager.destroyWallet(masterWalletId)
  }

  // Call this when delete identiy
  public static async deleteAllWallet() {
    // The MasterWalletManager is not created if the user does not signin.
    await this.loadMasterWalletManager();
    let allMasterWallets = this.masterWalletManager.getAllMasterWalletID();
    Logger.log('wallet', 'WalletJSSDKHelper deleteAllWallet count:', allMasterWallets.length);
    for (let i = 0; i < allMasterWallets.length; i++) {
      await this.masterWalletManager.destroyWallet(allMasterWallets[i])
    }
  }

  public static getMasterWallet(masterWalletId: string) {
    return this.masterWalletManager.getMasterWallet(masterWalletId);
  }

  public static async verifyPayPassword(masterWalletId: string, payPassword: string) {
    let masterWallet = await this.getMasterWallet(masterWalletId);
    return await masterWallet.verifyPayPassword(payPassword);
  }
}