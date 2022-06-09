import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { AESDecrypt } from '../../helpers/crypto/aes';
import { StandardMasterWallet } from '../model/masterwallets/masterwallet';
import { ElastosMainChainWalletNetworkOptions } from '../model/masterwallets/wallet.types';
import { WalletHelper } from '../model/networks/elastos/wallet.helper';
import { AuthService } from './auth.service';
import { Native } from './native.service';
import { PopupProvider } from './popup.service';
import { SPVService } from './spv.service';

/**
 * Higher level helper service on top of the SPV service. Reduces circular dependencies.
 */
export class SPVHelperService {
    public static instance: SPVHelperService = null;

    constructor(private native: Native, private event: Events, private popupProvider: PopupProvider) {
        SPVHelperService.instance = this;
    }

    /** Some standard wallets depend on the SPVSDK for some operations. We lazily initialize wallets
     * in the SPVSDK here in case they are not created yet.
     * We know that a JS wallet has its SPV SDK counterpart if there is a mapping between JS wallet ID
     * and SPV wallet ID in the SPV service.
     */
    public static async maybeCreateStandardSPVWalletFromJSWallet(masterWallet: StandardMasterWallet): Promise<boolean> {
        // If we find an existing mapping in the SPV service, nothing to do
        let spvMasterId = SPVService.instance.getSPVMasterID(masterWallet.id);
        if (spvMasterId) return true; // Already initialized

        Logger.log("wallet", "Creating the SPV wallet counterpart for wallet ", masterWallet.id);

        let payPassword = await AuthService.instance.getWalletPassword(masterWallet.id);
        if (!payPassword)
            return false; // Can't continue without the wallet password - cancel the initialization

        // No SPV wallet matching this JS wallet yet. Import one, in a different way depending on how the JS wallet
        // was imported
        let seed = await masterWallet.getSeed()
        if (seed) {
            // Decrypt the seed
            let decryptedSeed = await AESDecrypt(seed, payPassword);

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
            let descryptedPrivateKey = await AESDecrypt(await masterWallet.getPrivateKey(), payPassword);

            // Import the seed as new SPV SDK wallet
            let spvWalletId = WalletHelper.createSPVMasterWalletId();
            await SPVService.instance.createMasterWalletWithPrivKey(
                spvWalletId,
                descryptedPrivateKey,
                payPassword);

            // Save the JS<->SPV wallet id mapping
            await SPVService.instance.setMasterWalletIDMapping(masterWallet.id, spvWalletId);
        }

        return true;
    }
}
