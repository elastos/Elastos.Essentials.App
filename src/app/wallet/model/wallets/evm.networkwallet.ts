import { EVMNetwork } from '../networks/evm.network';
import { EVMTransactionProvider } from '../providers/evm.transaction.provider';
import { TransactionProvider } from '../providers/transaction.provider';
import { StandardEVMSubWallet } from './evm.subwallet';
import { MasterWallet } from './masterwallet';
import { NetworkWallet } from './networkwallet';

/**
 * Network wallet type for standard EVM networks
 */
export class EVMNetworkWallet extends NetworkWallet {
    private mainTokenSubWallet: StandardEVMSubWallet = null;

    constructor(
        public masterWallet: MasterWallet,
        public network: EVMNetwork,
        public displayToken: string, // Ex: "HT", "BSC"
        public mainSubWalletFriendlyName: string, // Ex: "Huobi Token"
        public averageBlocktime = 5 // Unit Second
    ) {
        super(masterWallet, network, displayToken);
    }

    protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
        return new EVMTransactionProvider(this);
    }

    protected async prepareStandardSubWallets(): Promise<void> {
        this.mainTokenSubWallet = new StandardEVMSubWallet(
            this,
            this.network.getEVMSPVConfigName(),
            this.network.getMainEvmRpcApiUrl(),
            this.mainSubWalletFriendlyName
        );
        await this.mainTokenSubWallet.initialize();
        this.subWallets[this.network.getEVMSPVConfigName()] = this.mainTokenSubWallet;
        await this.masterWallet.walletManager.spvBridge.createSubWallet(this.masterWallet.id, this.network.getEVMSPVConfigName());
    }

    public getMainEvmSubWallet(): StandardEVMSubWallet {
        return this.mainTokenSubWallet;
    }

    public getDisplayTokenName(): string {
        return this.displayToken;
    }

    public getAverageBlocktime(): number {
        return this.averageBlocktime;
    }
}
