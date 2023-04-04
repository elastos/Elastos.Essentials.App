import { MasterWallet } from '../../../masterwallets/masterwallet';
import { WalletNetworkOptions } from '../../../masterwallets/wallet.types';
import { Safe } from '../../../safes/safe';
import { NetworkWallet, WalletAddressInfo } from '../../base/networkwallets/networkwallet';
import { AnySubWallet } from '../../base/subwallets/subwallet';
import { MainCoinEVMSubWallet } from '../../evms/subwallets/evm.subwallet';
import { CosmosNetwork } from '../cosmos.network';
import { MainCoinCosmosSubWallet } from '../subwallets/cosmos.subwallet';

/**
 * Network wallet type for standard cosmos networks
 */
export abstract class CosmosNetworkWallet<MasterWalletType extends MasterWallet, WalletNetworkOptionsType extends WalletNetworkOptions> extends NetworkWallet<MasterWalletType, WalletNetworkOptionsType> {
    protected mainTokenSubWallet: MainCoinCosmosSubWallet<WalletNetworkOptionsType> = null;

    constructor(
        masterWallet: MasterWalletType,
        public network: CosmosNetwork,
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

    public getAddresses(): WalletAddressInfo[] {
        return [
            {
                title: this.mainTokenSubWallet.getFriendlyName(),
                address: this.mainTokenSubWallet.getAccountAddress()
            }
        ];
    }

    public getMainEvmSubWallet(): MainCoinEVMSubWallet<any> {
        return null;
    }

    public getMainTokenSubWallet(): AnySubWallet {
        return this.mainTokenSubWallet;
    }

    public getDisplayTokenName(): string {
        return this.displayToken;
    }

    public getAverageBlocktime(): number {
        return this.averageBlocktime;
    }

    // protected async fetchExtendedTxInfo(txHash: string): Promise<ExtendedTransactionInfo> {
    //     // Fetch transaction receipt
    //     let receipt = await EVMService.instance.getTransactionReceipt(this.network, txHash);
    //     if (!receipt)
    //         return;

    //     // Save extended info to cache
    //     if (receipt) {
    //         await this.saveExtendedTxInfo(txHash, {
    //             evm: {
    //                 transactionReceipt: receipt
    //             }
    //         });
    //     }
    // }
}

export abstract class AnyCosmosNetworkWallet extends CosmosNetworkWallet<any, any> { }