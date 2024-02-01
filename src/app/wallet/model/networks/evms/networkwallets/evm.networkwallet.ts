import { EVMService } from 'src/app/wallet/services/evm/evm.service';
import { ExtendedTransactionInfo } from '../../../extendedtxinfo';
import { MasterWallet } from '../../../masterwallets/masterwallet';
import { WalletNetworkOptions } from '../../../masterwallets/wallet.types';
import { AddressUsage } from '../../../safes/addressusage';
import { Safe } from '../../../safes/safe';
import { NetworkWallet, WalletAddressInfo } from '../../base/networkwallets/networkwallet';
import { AnySubWallet } from '../../base/subwallets/subwallet';
import type { EVMNetwork } from '../evm.network';
import { MainCoinEVMSubWallet } from '../subwallets/evm.subwallet';

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

    /* protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
        return new EVMTransactionProvider(this);
    } */

    public getAddresses(): WalletAddressInfo[] {
        return [
            {
                // title: this.mainTokenSubWallet.getFriendlyName(),
                title: "EVM",
                address: this.mainTokenSubWallet.getAccountAddress()
            }
        ];
    }

    /**
     * Converts a given address to the target usage format. Most of the time, this method does nothing
     * and should not be overriden (same address format used everywhere). Though for some networks such as
     * IoTeX who can deal with 2 different formats, addresses have to be converted from one format to another,
     * for example when sending coins, users use ioXX formats, but internal implementations require EVM native
     * address formats with 0x.
     */
    public async convertAddressForUsage(address: string, usage: AddressUsage): Promise<string> {
        return await (address.startsWith('0x') ? address : '0x' + address);
    }

    public getMainEvmSubWallet(): MainCoinEVMSubWallet<WalletNetworkOptionsType> {
        return this.mainTokenSubWallet;
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

    protected async fetchExtendedTxInfo(txHash: string): Promise<ExtendedTransactionInfo> {
        // Fetch transaction receipt
        let receipt = await EVMService.instance.getTransactionReceipt(this.network, txHash);
        if (!receipt)
            return;

        // Save extended info to cache
        if (receipt) {
            await this.saveExtendedTxInfo(txHash, {
                evm: {
                    transactionReceipt: receipt
                }
            });
        }
    }
}

export abstract class AnyEVMNetworkWallet extends EVMNetworkWallet<any, any> { }