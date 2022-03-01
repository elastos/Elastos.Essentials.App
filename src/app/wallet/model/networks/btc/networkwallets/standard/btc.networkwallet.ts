import { SPVSDKSafe } from "src/app/wallet/model/safes/spvsdk.safe";
import { jsToSpvWalletId, SPVService } from "src/app/wallet/services/spv.service";
import { StandardCoinName } from "../../../../coin";
import { StandardMasterWallet } from "../../../../masterwallets/masterwallet";
import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { WalletAddressInfo } from "../../../base/networkwallets/networkwallet";
import { StandardNetworkWallet } from "../../../base/networkwallets/standard.networkwallet";
import { MainCoinEVMSubWallet } from "../../../evms/subwallets/evm.subwallet";
import { AnyNetwork } from "../../../network";
import { BTCSubWallet } from "../../subwallets/btc.subwallet";
import { BTCTransactionProvider } from "../../tx-providers/btc.transaction.provider";

/**
 * Network wallet type for the bitcoin network
 */
export class BTCNetworkWallet extends StandardNetworkWallet<any> {
    constructor(public masterWallet: StandardMasterWallet, public network: AnyNetwork) {
        super(
            masterWallet,
            network,
            new SPVSDKSafe(masterWallet, "BTC"),
            'BTC'
        );
    }

    public async initialize(): Promise<void> {
        if (!await SPVService.instance.maybeCreateStandardSPVWalletFromJSWallet(this.masterWallet))
            return;

        await super.initialize();
    }

    protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
        return new BTCTransactionProvider(this);
    }

    protected async prepareStandardSubWallets(): Promise<void> {
        await SPVService.instance.createSubWallet(jsToSpvWalletId(this.masterWallet.id), StandardCoinName.BTC);
        this.subWallets[StandardCoinName.BTC] = new BTCSubWallet(this, this.network.getMainEvmRpcApiUrl());
        await this.subWallets[StandardCoinName.BTC].initialize();
    }

    public async getAddresses(): Promise<WalletAddressInfo[]> {
        return [
            {
                title: this.subWallets[StandardCoinName.BTC].getFriendlyName(),
                address: await this.subWallets[StandardCoinName.BTC].createAddress()
            }
        ];
    }

    public getMainEvmSubWallet(): MainCoinEVMSubWallet<any> {
        return null;
    }

    public getAverageBlocktime(): number {
        return 600;
    }
}
