import { BrowserLocalStorage, MasterWallet as SDKMasterWallet, MasterWalletManager } from "@elastosfoundation/wallet-js-sdk";
import { Logger } from "src/app/logger";
import { GlobalDIDSessionsService } from "src/app/services/global.didsessions.service";
import { GlobalNetworksService, MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { AuthService } from "src/app/wallet/services/auth.service";
import { WalletService } from "src/app/wallet/services/wallet.service";
import { MasterWallet, StandardMasterWallet } from "../../masterwallets/masterwallet";
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

  public static loadMasterWalletFromJSWallet(masterWallet: MasterWallet): SDKMasterWallet {
    let masterWalletManager = this.loadMasterWalletManager();
    return masterWalletManager.getMasterWallet(masterWallet.id);
  }

  public static async maybeCreateStandardWalletFromJSWallet(masterWallet: StandardMasterWallet): Promise<boolean> {
    Logger.log("wallet", "Creating Elastos Wallet JS SDK wallet entity for standard wallet ", masterWallet.id);

    let elastosNetworkOptions = masterWallet.getNetworkOptions("elastos") as ElastosMainChainWalletNetworkOptions;

    let masterWalletManager = this.loadMasterWalletManager();

    let walletExists = masterWalletManager.getAllMasterWalletID().indexOf(masterWallet.id) >= 0;
    if (walletExists) {
      // Wallet already exists, do nothing
      return true;
    }

    let payPassword = await AuthService.instance.getWalletPassword(masterWallet.id);
    if (!payPassword)
      return false; // Can't continue without the wallet password - cancel the initialization

    let seed = masterWallet.getSeed(payPassword);
    if (!seed) {
      Logger.error("wallet", "Elastos mainchain standard wallet can only be created from seed for now");
      return false;
    }

    const sdkMasterWallet = masterWalletManager.importWalletWithSeed(
      masterWallet.id,
      masterWallet.getSeed(payPassword),
      payPassword, // Multisig pay password, not signing wallet
      elastosNetworkOptions.singleAddress,
      "",
      ""
    );

    sdkMasterWallet.createSubWallet("ELA");

    return true;
  }

  public static async maybeCreateStandardMultiSigWalletFromJSWallet(masterWallet: StandardMultiSigMasterWallet): Promise<boolean> {
    Logger.log("wallet", "Creating Elastos Wallet JS SDK wallet entity for multisig wallet ", masterWallet.id);

    let elastosNetworkOptions = masterWallet.getNetworkOptions("elastos") as ElastosMainChainWalletNetworkOptions;

    console.log("masterWallet.signersExtPubKeys", masterWallet.signersExtPubKeys)

    let masterWalletManager = this.loadMasterWalletManager();

    let walletExists = masterWalletManager.getAllMasterWalletID().indexOf(masterWallet.id) >= 0;
    //let existingWallet = masterWalletManager.getMasterWallet(masterWallet.id);
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

    if (!(signingWallet instanceof StandardMasterWallet) || !signingWallet.getSeed()) {
      Logger.error("wallet", "Elastos mainchain multisig wallet can only use standard wallets with mnemonics for now");
      return false;
    }

    let signingWalletPayPassword = await AuthService.instance.getWalletPassword(signingWallet.id);
    if (!signingWalletPayPassword)
      return false; // Can't continue without the signing wallet password - cancel the initialization

    if (signingWallet.getSeed(signingWalletPayPassword)) {
      const sdkMasterWallet = masterWalletManager.createMultiSignMasterWalletWithSeed(
        masterWallet.id,
        signingWallet.getSeed(signingWalletPayPassword),
        payPassword, // Multisig pay password, not signing wallet
        masterWallet.signersExtPubKeys,
        masterWallet.requiredSigners,
        elastosNetworkOptions.singleAddress
      );

      sdkMasterWallet.createSubWallet("ELA");

      return true;
    }
    else {
      // NOTE: private key wallets not supported. Already checked above.
      return false;
    }
  }
}