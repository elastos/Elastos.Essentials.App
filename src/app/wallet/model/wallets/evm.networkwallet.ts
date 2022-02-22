import { jsToSpvWalletId, SPVService } from '../../services/spv.service';
import { EVMNetwork } from '../networks/evm.network';
import { EVMTransactionProvider } from '../tx-providers/evm.transaction.provider';
import { TransactionProvider } from '../tx-providers/transaction.provider';
import { WalletNetworkOptions } from '../wallet.types';
import { StandardEVMSubWallet } from './evm.subwallet';
import { StandardMasterWallet } from './masterwallet';
import { NetworkWallet, WalletAddressInfo } from './networkwallet';

/**
 * Network wallet type for standard EVM networks
 *
 * TODO: Split this class into "EVMNetworkWallet for standard wallet types" and "EVMNetworkWallet for ledger/multisig".
 * Currently forced to "StandardMasterWallet"
 */
export class EVMNetworkWallet<MasterWalletType extends StandardMasterWallet, WalletNetworkOptionsType extends WalletNetworkOptions> extends NetworkWallet<MasterWalletType, WalletNetworkOptionsType> {
    private mainTokenSubWallet: StandardEVMSubWallet<WalletNetworkOptionsType> = null;

    constructor(
        public masterWallet: MasterWalletType,
        public network: EVMNetwork,
        public displayToken: string, // Ex: "HT", "BSC"
        public mainSubWalletFriendlyName: string, // Ex: "Huobi Token"
        public averageBlocktime = 5 // Unit Second
    ) {
        super(masterWallet, network, displayToken);
    }

    public async initialize(): Promise<void> {
        // TODO: Stop using the SPVSDK for EVM network wallets
        if (!await SPVService.instance.maybeCreateStandardSPVWalletFromJSWallet(this.masterWallet))
            return;

        await super.initialize();
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
        await SPVService.instance.createSubWallet(jsToSpvWalletId(this.masterWallet.id), this.network.getEVMSPVConfigName());
    }

    public async getAddresses(): Promise<WalletAddressInfo[]> {
        return [
            {
                title: this.mainTokenSubWallet.getFriendlyName(),
                address: await this.mainTokenSubWallet.getTokenAddress()
            }
        ];
    }

    public getMainEvmSubWallet(): StandardEVMSubWallet<WalletNetworkOptionsType> {
        return this.mainTokenSubWallet;
    }

    public getDisplayTokenName(): string {
        return this.displayToken;
    }

    public getAverageBlocktime(): number {
        return this.averageBlocktime;
    }
}
