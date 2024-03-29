import { lazyKavaImport } from "src/app/helpers/import.helper";
import { GlobalTranslationService } from "src/app/services/global.translation.service";
import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { WalletNetworkOptions } from "src/app/wallet/model/masterwallets/wallet.types";
import { AddressUsage } from "src/app/wallet/model/safes/addressusage";
import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { WalletAddressInfo } from "../../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../../evms/evm.network";
import { EVMNetworkWallet } from "../../../evms/networkwallets/evm.networkwallet";
import { KavaLedgerSafe } from "../../safes/kava.ledger.safe";
import { KavaMainCoinSubwallet } from "../../subwallets/kava.subwallet";
import { KavaTransactionProvider } from "../../tx-providers/kava.transaction.provider";

export class KavaLedgerNetworkWallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends EVMNetworkWallet<LedgerMasterWallet, WalletNetworkOptionsType> {
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
            new KavaLedgerSafe(masterWallet, network.getMainChainID()),
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
        this.subWallets[this.network.getEVMSPVConfigName()] = this.mainTokenSubWallet;
    }

    protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
        return new KavaTransactionProvider(this);
    }

    public getAddresses(): WalletAddressInfo[] {
        let addressString = GlobalTranslationService.instance.translateInstant('common.address');
        return [
            {
                title: "EVM " + addressString,
                address: this.getMainEvmSubWallet().getCurrentReceiverAddress(AddressUsage.EVM_CALL)
            },
            {
                title: "Kava " + addressString,
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