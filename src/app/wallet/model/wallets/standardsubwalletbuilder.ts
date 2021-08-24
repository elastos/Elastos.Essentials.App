import { MasterWallet } from './masterwallet';
import { Coin, StandardCoinName } from '../coin';
import { StandardSubWallet } from './standard.subwallet';
import { SerializedSubWallet } from './subwallet';
import { ElastosEVMSubWallet } from './elastos/elastos.evm.subwallet';
import { MainchainSubWallet } from './elastos/mainchain.subwallet';
import { IDChainSubWallet } from './elastos/idchain.subwallet';
import { Logger } from 'src/app/logger';
import { HECOChainSubWallet } from './heco/heco.subwallet';
import { NetworkWallet } from './NetworkWallet';

/**
 * Helper class to create and restore standard sub wallet objects.
 */
export class StandardSubWalletBuilder {
    /* private static newSubWalletFromId(masterWallet: MasterWallet, coinName: StandardCoinName): StandardSubWallet {
        switch (coinName) {
            case StandardCoinName.ELA:
                return new MainchainSubWallet(masterWallet);
            case StandardCoinName.IDChain:
                return new IDChainSubWallet(masterWallet);
            case StandardCoinName.ETHSC:
            case StandardCoinName.ETHDID:
                return new ElastosEVMSubWallet(masterWallet, coinName);
            case StandardCoinName.ETHHECO:
                return new HECOChainSubWallet(masterWallet);
            default:
                return null;
        }
    } */

    /* public static async newFromCoin(masterWallet: MasterWallet, coin: Coin): Promise<StandardSubWallet> {
        let coinName = StandardCoinName.fromCoinID(coin.getID());

        // Create the subwallet in the SPV SDK first, before creating it in our model, as further function
        // calls need the SPV entry to be ready.
        await masterWallet.walletManager.spvBridge.createSubWallet(masterWallet.id, coinName);

        return this.newSubWalletFromId(masterWallet, coinName);
    }

    public static newFromSerializedSubWallet(masterWallet: MasterWallet, serializedSubWallet: SerializedSubWallet): StandardSubWallet {
        Logger.log("wallet", "Initializing standard subwallet from serialized sub wallet", serializedSubWallet);
        let subWallet = this.newSubWalletFromId(masterWallet, serializedSubWallet.id);
        return subWallet;
    } */
}