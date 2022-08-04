import { StandardMasterWallet } from '../../../../masterwallets/masterwallet';
import { WalletNetworkOptions } from '../../../../masterwallets/wallet.types';
import { WalletJSSDKHelper } from '../../../elastos/wallet.jssdk.helper';
import type { EVMNetwork } from '../../evm.network';
import { EVMWalletJSSafe } from '../../safes/evm.walletjs.safe';
import { MainCoinEVMSubWallet } from '../../subwallets/evm.subwallet';
import { EVMNetworkWallet } from '../evm.networkwallet';

export abstract class StandardEVMNetworkWallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends EVMNetworkWallet<StandardMasterWallet, WalletNetworkOptionsType> {
    constructor(
        masterWallet: StandardMasterWallet,
        network: EVMNetwork,
        displayToken: string, // Ex: "HT", "BSC"
        mainSubWalletFriendlyName: string, // Ex: "Huobi Token"
        averageBlocktime = 5 // seconds between each block generation on chain
    ) {
        super(
            masterWallet,
            network,
            new EVMWalletJSSafe(masterWallet, network.getEVMSPVConfigName()),
            displayToken,
            mainSubWalletFriendlyName,
            averageBlocktime
        );
    }

    public async initialize(): Promise<void> {
        if (!await WalletJSSDKHelper.maybeCreateStandardWalletFromJSWallet(this.masterWallet))
            return;

        await super.initialize();
    }

    protected async prepareStandardSubWallets(): Promise<void> {
        this.mainTokenSubWallet = new MainCoinEVMSubWallet(
            this,
            this.network.getEVMSPVConfigName(),
            this.mainSubWalletFriendlyName
        );
        await this.mainTokenSubWallet.initialize();
        this.subWallets[this.network.getEVMSPVConfigName()] = this.mainTokenSubWallet;
        await WalletJSSDKHelper.createSubWallet(this.masterWallet.id, this.network.getEVMSPVConfigName());
    }
}
