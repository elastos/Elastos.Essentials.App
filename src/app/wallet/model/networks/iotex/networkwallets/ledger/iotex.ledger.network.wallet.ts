import { from } from "@iotexproject/iotex-address-ts";
import { GlobalTranslationService } from "src/app/services/global.translation.service";
import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { WalletNetworkOptions } from "src/app/wallet/model/masterwallets/wallet.types";
import { AddressUsage } from "src/app/wallet/model/safes/addressusage";
import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { WalletAddressInfo } from "../../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../../evms/evm.network";
import { EVMNetworkWallet } from "../../../evms/networkwallets/evm.networkwallet";
import { IotexLedgerSafe } from "../../safes/iotex.ledger.safe";
import { IoTeXMainCoinSubwallet } from "../../subwallets/iotex.subwallet";
import { IoTeXChainTransactionProvider } from "../../tx-providers/iotex.transaction.provider";

export class IOTEXLedgerNetworkWallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends EVMNetworkWallet<LedgerMasterWallet, WalletNetworkOptionsType> {
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
            new IotexLedgerSafe(masterWallet, network.getMainChainID()),
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
        this.subWallets[this.network.getEVMSPVConfigName()] = this.mainTokenSubWallet;
    }

    protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
        return new IoTeXChainTransactionProvider(this);
    }

    public getAddresses(): WalletAddressInfo[] {
        let addressString = GlobalTranslationService.instance.translateInstant('common.address');
        return [
            {
                title: "EVM " + addressString,
                address: this.getMainEvmSubWallet().getCurrentReceiverAddress(AddressUsage.EVM_CALL)
            },
            {
                title: "IoTeX " + addressString,
                address: this.getMainEvmSubWallet().getCurrentReceiverAddress(AddressUsage.IOTEX)
            }
        ];
    }

    // Override - Can convert kavaXXX to 0x
    public async convertAddressForUsage(address: string, usage: AddressUsage): Promise<string> {
        let addressTemp;
        if (!address.startsWith('io') && !address.startsWith('0x')) {
            addressTemp = '0x' + address;
        } else {
            addressTemp = address;
        }

        if (usage === AddressUsage.EVM_CALL) {
            const addr = from(addressTemp);
            return await addr.stringEth();
        }
        else if (usage === AddressUsage.DISPLAY_TRANSACTIONS) {
            const addr = from(addressTemp);
            return await addr.string();
        }
        else
            return await addressTemp;
    }
}