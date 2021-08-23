import { MasterWallet } from '../masterwallet';
import { Coin, StandardCoinName } from '../../Coin';
import { StandardSubWallet } from '../standard.subwallet';
import { SerializedSubWallet } from '../subwallet';
import { ETHChainSubWallet } from './evm.subwallet';
import { MainchainSubWallet } from './mainchain.subwallet';
import { IDChainSubWallet } from './idchain.subwallet';
import { Logger } from 'src/app/logger';
import { HECOChainSubWallet } from '../heco/heco.subwallet';
import { NetworkWallet } from '../NetworkWallet';

/**
 * Helper class to create and restore standard sub wallet objects.
 */
export class StandardSubWalletBuilder {
    private static newSubWalletFromId(networkWallet: NetworkWallet, coinName: StandardCoinName): StandardSubWallet {
        switch (coinName) {
            case StandardCoinName.ELA:
                return new MainchainSubWallet(networkWallet);
            case StandardCoinName.IDChain:
                return new IDChainSubWallet(networkWallet);
            case StandardCoinName.ETHSC:
            case StandardCoinName.ETHDID:
                return new ETHChainSubWallet(networkWallet, coinName);
            /* case StandardCoinName.ETHHECO:
                return new HECOChainSubWallet(masterWallet, coinName); */
            default:
                return null;
        }
    }

    public static async newFromCoin(networkWallet: NetworkWallet, coin: Coin): Promise<StandardSubWallet> {
        let coinName = StandardCoinName.fromCoinID(coin.getID());

        // Create the subwallet in the SPV SDK first, before creating it in our model, as further function
        // calls need the SPV entry to be ready.
        await networkWallet.masterWallet.walletManager.spvBridge.createSubWallet(networkWallet.id, coinName);

        return this.newSubWalletFromId(networkWallet, coinName);
    }

    public static newFromSerializedSubWallet(networkWallet: NetworkWallet, serializedSubWallet: SerializedSubWallet): StandardSubWallet {
        Logger.log("wallet", "Initializing standard subwallet from serialized sub wallet", serializedSubWallet);
        let subWallet = this.newSubWalletFromId(networkWallet, serializedSubWallet.id);
        return subWallet;
    }
}