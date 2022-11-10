import { lazyKavaImport } from 'src/app/helpers/import.helper';
import { StandardMasterWallet } from 'src/app/wallet/model/masterwallets/masterwallet';
import { WalletNetworkOptions } from 'src/app/wallet/model/masterwallets/wallet.types';
import { AddressUsage } from "src/app/wallet/model/safes/addressusage";
import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { WalletAddressInfo } from "../../../base/networkwallets/networkwallet";
import { EVMNetworkWallet } from '../../../evms/networkwallets/evm.networkwallet';
import { KavaAPI, KavaApiType } from '../../network/kava.api';
import { KavaBaseNetwork } from '../../network/kava.base.network';
import { KavaStandardSafe } from '../../safes/standard.safe';
import { KavaMainCoinSubwallet } from "../../subwallets/kava.subwallet";
import { KavaTransactionProvider } from "../../tx-providers/kava.transaction.provider";

export class KavaNetworkWallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends EVMNetworkWallet<StandardMasterWallet, WalletNetworkOptionsType> {

    constructor(
        masterWallet: StandardMasterWallet,
        network: KavaBaseNetwork,
        displayToken: string, // Ex: "HT", "BSC"
        mainSubWalletFriendlyName: string, // Ex: "Huobi Token"
        averageBlocktime = 5 // seconds between each block generation on chain
    ) {
        super(
            masterWallet,
            network,
            new KavaStandardSafe(masterWallet, network, KavaAPI.getApiUrl(KavaApiType.RPC, network.networkTemplate)),
            displayToken,
            mainSubWalletFriendlyName,
            averageBlocktime
        );
    }

    protected async prepareStandardSubWallets(): Promise<void> {
        this.mainTokenSubWallet = new KavaMainCoinSubwallet(
            this,
            this.network.getEVMSPVConfigName(),
            this.mainSubWalletFriendlyName
        );
        await this.mainTokenSubWallet.initialize();
        // TODO: don't need to use getEVMSPVConfigName() (we don't use SPV SDK), use any other identifier
        this.subWallets[this.network.getEVMSPVConfigName()] = this.mainTokenSubWallet;
    }

    protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
        return new KavaTransactionProvider(this);
    }

    public getAddresses(): WalletAddressInfo[] {
        return [
            {
                title: "EVM address",
                address: this.getMainEvmSubWallet().getCurrentReceiverAddress(AddressUsage.EVM_CALL)
            },
            {
                title: "Kava address",
                address: this.getMainEvmSubWallet().getCurrentReceiverAddress(AddressUsage.KAVA)
            }
        ];
    }

    // Override - Can convert kavaXXX to 0x
    public async convertAddressForUsage(address: string, usage: AddressUsage): Promise<string> {
        let addressTemp;
        if (!address.startsWith('kava') && !address.startsWith('0x')) {
            addressTemp = '0x' + address;
        } else {
            addressTemp = address;
        }

        let isKavaAddress = false;
        if (addressTemp.startsWith('kava')) {
            isKavaAddress = true;
        }

        if (usage === AddressUsage.EVM_CALL) {
            if (isKavaAddress) {
                const { utils } = await lazyKavaImport();
                return utils.kavaToEthAddress(addressTemp);
            } else {
                return addressTemp
            }
        }
        else if (usage === AddressUsage.DISPLAY_TRANSACTIONS) {
            // The block explorer use evm address.
            if (isKavaAddress) {
                const { utils } = await lazyKavaImport();
                return utils.kavaToEthAddress(addressTemp);
            } else {
                return addressTemp
            }
            // return utils.ethToKavaAddress(addressTemp);
        }
        else
            return addressTemp;
    }
}