import { from } from '@iotexproject/iotex-address-ts';
import { AddressUsage } from 'src/app/wallet/model/safes/addressusage';
import { TransactionProvider } from 'src/app/wallet/model/tx-providers/transaction.provider';
import { StandardMasterWallet } from '../../../../masterwallets/masterwallet';
import { WalletNetworkOptions } from '../../../../masterwallets/wallet.types';
import { WalletAddressInfo } from '../../../base/networkwallets/networkwallet';
import { EVMNetworkWallet } from '../../../evms/networkwallets/evm.networkwallet';
import { IoTeXAPI, IoTeXApiType } from '../../network/iotex.api';
import { IoTeXBaseNetwork } from '../../network/iotex.base.network';
import { IoTeXStandardSafe } from '../../safes/standard.safe';
import { IoTeXMainCoinSubwallet } from '../../subwallets/iotex.subwallet';
import { IoTeXChainTransactionProvider } from '../../tx-providers/iotex.transaction.provider';

export class StandardIoTeXNetworkWallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends EVMNetworkWallet<StandardMasterWallet, WalletNetworkOptionsType> {
    constructor(
        masterWallet: StandardMasterWallet,
        network: IoTeXBaseNetwork,
        displayToken: string, // Ex: "HT", "BSC"
        mainSubWalletFriendlyName: string, // Ex: "Huobi Token"
        averageBlocktime = 5 // seconds between each block generation on chain
    ) {
        super(
            masterWallet,
            network,
            new IoTeXStandardSafe(masterWallet, network, IoTeXAPI.getApiUrl(IoTeXApiType.gRPC, network.networkTemplate)),
            displayToken,
            mainSubWalletFriendlyName,
            averageBlocktime
        );
    }

    protected async prepareStandardSubWallets(): Promise<void> {
        this.mainTokenSubWallet = new IoTeXMainCoinSubwallet(
            this,
            this.network.getEVMSPVConfigName(),
            this.mainSubWalletFriendlyName
        );
        await this.mainTokenSubWallet.initialize();
        // TODO: don't need to use getEVMSPVConfigName() (we don't use SPV SDK), use any other identifier
        this.subWallets[this.network.getEVMSPVConfigName()] = this.mainTokenSubWallet;
    }

    protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
        return new IoTeXChainTransactionProvider(this);
    }

    public getAddresses(): WalletAddressInfo[] {
        return [
            {
                title: "EVM address",
                address: this.getMainEvmSubWallet().getCurrentReceiverAddress(AddressUsage.EVM_CALL)
            },
            {
                title: "IoTeX address",
                address: this.getMainEvmSubWallet().getCurrentReceiverAddress(AddressUsage.IOTEX)
            }
        ];
    }

    // Override - Can convert ioXXX to 0x
    public convertAddressForUsage(address: string, usage: AddressUsage): string {
        let addressTemp;
        if (!address.startsWith('io') && !address.startsWith('0x')) {
            addressTemp = '0x' + address;
        } else {
            addressTemp = address;
        }

        if (usage === AddressUsage.EVM_CALL) {
            const addr = from(addressTemp);
            return addr.stringEth();
        }
        else if (usage === AddressUsage.DISPLAY_TRANSACTIONS) {
            const addr = from(addressTemp);
            return addr.string();
        }
        else
            return addressTemp;
    }
}
