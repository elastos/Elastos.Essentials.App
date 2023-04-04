import { StandardMasterWallet } from '../../../../masterwallets/masterwallet';
import { WalletNetworkOptions } from '../../../../masterwallets/wallet.types';
import { CosmosNetwork } from '../../cosmos.network';
import { CosmosWalletJSSafe } from '../../safes/cosmos.walletjs.safe';
import { MainCoinCosmosSubWallet } from '../../subwallets/cosmos.subwallet';
import { CosmosNetworkWallet } from '../cosmos.networkwallet';

export abstract class StandardCosmosNetworkWallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends CosmosNetworkWallet<StandardMasterWallet, WalletNetworkOptionsType> {
    constructor(
        masterWallet: StandardMasterWallet,
        network: CosmosNetwork,
        displayToken: string, // Ex: "HT", "BSC"
        mainSubWalletFriendlyName: string, // Ex: "Huobi Token"
        addressPrefix: string,
        hdPath: string,
        averageBlocktime = 5, // seconds between each block generation on chain
    ) {
        super(
            masterWallet,
            network,
            new CosmosWalletJSSafe(masterWallet, addressPrefix, hdPath),
            displayToken,
            mainSubWalletFriendlyName,
            averageBlocktime
        );
    }

    protected async prepareStandardSubWallets(): Promise<void> {
        this.mainTokenSubWallet = new MainCoinCosmosSubWallet(
            this,
            this.network.key,
            this.mainSubWalletFriendlyName
        );
        await this.mainTokenSubWallet.initialize();
        this.subWallets[this.network.key] = this.mainTokenSubWallet;
    }
}
