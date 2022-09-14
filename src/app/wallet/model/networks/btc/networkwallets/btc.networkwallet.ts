import { StandardCoinName } from "../../../coin";
import { MasterWallet } from "../../../masterwallets/masterwallet";
import { WalletNetworkOptions } from "../../../masterwallets/wallet.types";
import { Safe } from "../../../safes/safe";
import { TransactionProvider } from "../../../tx-providers/transaction.provider";
import { NetworkWallet, WalletAddressInfo } from "../../base/networkwallets/networkwallet";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { MainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { AnyNetwork } from "../../network";
import { BTCTransactionProvider } from "../tx-providers/btc.transaction.provider";


/**
 * Network wallet type for the bitcoin network
 */
export abstract class BTCNetworkWallet <MasterWalletType extends MasterWallet, WalletNetworkOptionsType extends WalletNetworkOptions> extends NetworkWallet<MasterWalletType, WalletNetworkOptionsType> {
    constructor(public masterWallet: MasterWalletType,
                public network: AnyNetwork,
                safe: Safe) {
        super(
            masterWallet,
            network,
            safe,
            'BTC'
        );
    }

    protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
        return new BTCTransactionProvider(this);
    }

    public async getAddresses(): Promise<WalletAddressInfo[]> {
        return [
            {
                title: this.subWallets[StandardCoinName.BTC].getFriendlyName(),
                address: await this.subWallets[StandardCoinName.BTC].getCurrentReceiverAddress()
            }
        ];
    }

    public getMainEvmSubWallet(): MainCoinEVMSubWallet<any> {
        return null;
    }

    public getMainTokenSubWallet(): AnySubWallet {
        return this.subWallets[StandardCoinName.BTC];
    }

    public getAverageBlocktime(): number {
        return 600;
    }
}

export abstract class AnyBTCNetworkWallet extends BTCNetworkWallet<any, any> { }