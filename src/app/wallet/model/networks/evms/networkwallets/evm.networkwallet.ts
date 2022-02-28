import { MasterWallet } from '../../../masterwallets/masterwallet';
import { WalletNetworkOptions } from '../../../masterwallets/wallet.types';
import { Safe } from '../../../safes/safe';
import type { TransactionProvider } from '../../../tx-providers/transaction.provider';
import { NetworkWallet, WalletAddressInfo } from '../../base/networkwallets/networkwallet';
import type { EVMNetwork } from '../evm.network';
import { MainCoinEVMSubWallet } from '../subwallets/evm.subwallet';
import { EVMTransactionProvider } from '../tx-providers/evm.transaction.provider';

/**
 * Network wallet type for standard EVM networks
 */
export abstract class EVMNetworkWallet<MasterWalletType extends MasterWallet, WalletNetworkOptionsType extends WalletNetworkOptions> extends NetworkWallet<MasterWalletType, WalletNetworkOptionsType> {
    protected mainTokenSubWallet: MainCoinEVMSubWallet<WalletNetworkOptionsType> = null;

    constructor(
        masterWallet: MasterWalletType,
        public network: EVMNetwork,
        safe: Safe,
        displayToken: string, // Ex: "HT", "BSC"
        public mainSubWalletFriendlyName: string, // Ex: "Huobi Token"
        public averageBlocktime = 5 // seconds between each block generation on chain
    ) {
        super(
            masterWallet,
            network,
            safe,
            displayToken
        );
    }

    protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
        return new EVMTransactionProvider(this);
    }

    public async getAddresses(): Promise<WalletAddressInfo[]> {
        return [
            {
                title: this.mainTokenSubWallet.getFriendlyName(),
                address: await this.mainTokenSubWallet.getTokenAddress()
            }
        ];
    }

    public getMainEvmSubWallet(): MainCoinEVMSubWallet<WalletNetworkOptionsType> {
        return this.mainTokenSubWallet;
    }

    public getDisplayTokenName(): string {
        return this.displayToken;
    }

    public getAverageBlocktime(): number {
        return this.averageBlocktime;
    }
}

export abstract class AnyEVMNetworkWallet extends EVMNetworkWallet<any, any> { }