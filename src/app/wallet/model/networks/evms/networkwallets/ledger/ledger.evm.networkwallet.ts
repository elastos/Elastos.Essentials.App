import { Logger } from 'src/app/logger';
import { LedgerMasterWallet } from 'src/app/wallet/model/masterwallets/ledger.masterwallet';
import { WalletNetworkOptions } from '../../../../masterwallets/wallet.types';
import type { EVMNetwork } from '../../evm.network';
import { EVMLedgerSafe } from '../../safes/evm.ledger.safe';
import { MainCoinEVMSubWallet } from '../../subwallets/evm.subwallet';
import { EVMNetworkWallet } from '../evm.networkwallet';

export class LedgerEVMNetworkWallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends EVMNetworkWallet<LedgerMasterWallet, WalletNetworkOptionsType> {
    public accountID = '';

    constructor(
        masterWallet: LedgerMasterWallet,
        network: EVMNetwork,
        displayToken: string, // Ex: "HT", "BSC"
        mainSubWalletFriendlyName: string, // Ex: "Huobi Token"
        averageBlocktime = 5 // seconds between each block generation on chain
    ) {
        super(
            masterWallet,
            network,
            new EVMLedgerSafe(masterWallet, network.getMainChainID()),
            displayToken,
            mainSubWalletFriendlyName,
            averageBlocktime
        );

        Logger.warn('wallet', 'LedgerEVMNetworkWallet constructor:', this)
    }

    protected async prepareStandardSubWallets(): Promise<void> {
        this.mainTokenSubWallet = new MainCoinEVMSubWallet(
            this,
            this.network.getEVMSPVConfigName(),
            this.mainSubWalletFriendlyName
        );
        await this.mainTokenSubWallet.initialize();
        this.subWallets[this.network.getEVMSPVConfigName()] = this.mainTokenSubWallet;

        Logger.warn('wallet', 'LedgerEVMNetworkWallet prepareStandardSubWallets:', this)
    }
}
