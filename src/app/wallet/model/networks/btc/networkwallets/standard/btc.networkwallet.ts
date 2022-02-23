import { jsToSpvWalletId, SPVService } from "src/app/wallet/services/spv.service";
import { StandardCoinName } from "../../../../coin";
import { StandardMasterWallet } from "../../../../masterwallets/masterwallet";
import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { WalletAddressInfo } from "../../../base/networkwallets/networkwallet";
import { StandardNetworkWallet } from "../../../base/networkwallets/standard.networkwallet";
import { StandardEVMSubWallet } from "../../../evms/subwallets/evm.subwallet";
import { AnyNetwork } from "../../../network";
import { BTCTransactionProvider } from "../../tx-providers/btc.transaction.provider";
import { BTCSubWallet } from "./btc.subwallet";

/**
 * Network wallet type for standard EVM networks
 */
export class BTCNetworkWallet extends StandardNetworkWallet<any> {
    // private mainTokenSubWallet: StandardEVMSubWallet = null;

    constructor(
        public masterWallet: StandardMasterWallet,
        public network: AnyNetwork
    ) {
        super(masterWallet, network, 'BTC');
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

    public getMainEvmSubWallet(): StandardEVMSubWallet<any> {
        return null;
    }

    public getAverageBlocktime(): number {
        return 600;
    }
}
