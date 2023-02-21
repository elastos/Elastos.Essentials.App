import { GlobalTronGridService } from "src/app/services/global.tron.service";
import { StandardCoinName } from "../../../coin";
import { ExtendedTransactionInfo } from "../../../extendedtxinfo";
import { MasterWallet } from "../../../masterwallets/masterwallet";
import { WalletNetworkOptions } from "../../../masterwallets/wallet.types";
import { Safe } from "../../../safes/safe";
import { TransactionProvider } from "../../../tx-providers/transaction.provider";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { NetworkWallet, WalletAddressInfo } from "../../base/networkwallets/networkwallet";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { MainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { TronNetworkBase } from "../network/tron.base.network";
import { TronTransactionProvider } from "../tx-providers/tron.transaction.provider";


/**
 * Network wallet type for the tron network
 */
export abstract class TronNetworkWallet <MasterWalletType extends MasterWallet, WalletNetworkOptionsType extends WalletNetworkOptions> extends NetworkWallet<MasterWalletType, WalletNetworkOptionsType> {
    constructor(public masterWallet: MasterWalletType,
                public network: TronNetworkBase,
                safe: Safe) {
        super(
            masterWallet,
            network,
            safe,
            'TRX'
        );
    }

    protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
        return new TronTransactionProvider(this);
    }

    public getAddresses(): WalletAddressInfo[] {
        return [
            {
                title: this.subWallets[StandardCoinName.TRON].getFriendlyName(),
                address: this.subWallets[StandardCoinName.TRON].getCurrentReceiverAddress()
            }
        ];
    }

    public getMainEvmSubWallet(): MainCoinEVMSubWallet<any> {
        return null;
    }

    public getMainTokenSubWallet(): AnySubWallet {
        return this.subWallets[StandardCoinName.TRON];
    }

    public getAverageBlocktime(): number {
        return 3;
    }

    protected async fetchExtendedTxInfo(txHash: string): Promise<ExtendedTransactionInfo> {
        // Fetch transaction receipt
        let txInfo = await GlobalTronGridService.instance.getTransactionInfoById(this.network.getAPIUrlOfType(NetworkAPIURLType.RPC), txHash);
        if (!txInfo)
            return;

        // Save extended info to cache
        if (txInfo) {
            await this.saveExtendedTxInfo(txHash, {
                tvm: {
                    txInfo: txInfo
                }
            });
        }
    }
}

export abstract class AnyTronNetworkWallet extends TronNetworkWallet<any, any> { }