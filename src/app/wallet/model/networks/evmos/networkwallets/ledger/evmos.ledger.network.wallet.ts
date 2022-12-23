import { lazyEvmosImport } from "src/app/helpers/import.helper";
import { GlobalTranslationService } from "src/app/services/global.translation.service";
import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { WalletNetworkOptions } from "src/app/wallet/model/masterwallets/wallet.types";
import { AddressUsage } from "src/app/wallet/model/safes/addressusage";
import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { WalletAddressInfo } from "../../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../../evms/evm.network";
import { EVMNetworkWallet } from "../../../evms/networkwallets/evm.networkwallet";
import { EvmosLedgerSafe } from "../../safes/evmos.ledger.safe";
import { EvmosMainCoinSubwallet } from "../../subwallets/evmos.subwallet";
import { EvmosTransactionProvider } from "../../tx-providers/evmos.transaction.provider";

export class EvmosLedgerNetworkWallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends EVMNetworkWallet<LedgerMasterWallet, WalletNetworkOptionsType> {
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
            new EvmosLedgerSafe(masterWallet, network.getMainChainID()),
            displayToken,
            mainSubWalletFriendlyName,
            averageBlocktime
        );
    }

    protected async prepareStandardSubWallets(): Promise<void> {
        this.mainTokenSubWallet = new EvmosMainCoinSubwallet(
            this,
            this.network.getEVMSPVConfigName(),
            this.mainSubWalletFriendlyName
        );
        await this.mainTokenSubWallet.initialize();
        this.subWallets[this.network.getEVMSPVConfigName()] = this.mainTokenSubWallet;
    }

    protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
        return new EvmosTransactionProvider(this);
    }

    public getAddresses(): WalletAddressInfo[] {
        let addressString = GlobalTranslationService.instance.translateInstant('common.address');
        return [
            {
                title: "EVM " + addressString,
                address: this.getMainEvmSubWallet().getCurrentReceiverAddress(AddressUsage.EVM_CALL)
            },
            {
                title: "Evmos " + addressString,
                address: this.getMainEvmSubWallet().getCurrentReceiverAddress(AddressUsage.EVMOS)
            }
        ];
    }

    // Override - Can convert evmosXXX to 0x
    public async convertAddressForUsage(address: string, usage: AddressUsage): Promise<string> {
        let addressTemp;
        if (!address.startsWith('evmos') && !address.startsWith('0x')) {
            addressTemp = '0x' + address;
        } else {
            addressTemp = address;
        }

        let isEvmosAddress = false;
        if (addressTemp.startsWith('evmos')) {
            isEvmosAddress = true;
        }

        if (usage === AddressUsage.EVM_CALL) {
            if (isEvmosAddress) {
                const { evmosToEth } = await lazyEvmosImport();
                return evmosToEth(addressTemp);
            } else {
                return addressTemp
            }
        }
        else if (usage === AddressUsage.DISPLAY_TRANSACTIONS) {
            // The block explorer use evm address.
            if (isEvmosAddress) {
                const { evmosToEth } = await lazyEvmosImport();
                return evmosToEth(addressTemp);
            } else {
                return addressTemp
            }
        }
        else
            return addressTemp;
    }
}