import { MasterWallet } from './MasterWallet';
import { Coin, StandardCoinName } from '../Coin';
import { StandardSubWallet } from './StandardSubWallet';
import { SerializedSubWallet } from './SubWallet';
import { ETHChainSubWallet } from './ETHChainSubWallet';
import { MainchainSubWallet } from './MainchainSubWallet';
import { IDChainSubWallet } from './IDChainSubWallet';
import { Logger } from 'src/app/logger';

/**
 * Helper class to create and restore standard sub wallet objects.
 */
export class StandardSubWalletBuilder {
    private static newSubWalletFromId(masterWallet: MasterWallet, coinName: StandardCoinName): StandardSubWallet {
        switch (coinName) {
            case StandardCoinName.ELA:
                return new MainchainSubWallet(masterWallet);
            case StandardCoinName.IDChain:
                return new IDChainSubWallet(masterWallet);
            case StandardCoinName.ETHSC:
            case StandardCoinName.ETHDID:
            // case StandardCoinName.ETHHECO:
                return new ETHChainSubWallet(masterWallet, coinName);
            default:
                return null;
        }
    }

    public static async newFromCoin(masterWallet: MasterWallet, coin: Coin): Promise<StandardSubWallet> {
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
    }
}