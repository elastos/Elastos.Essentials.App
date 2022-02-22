import { jsToSpvWalletId, SPVService } from "src/app/wallet/services/spv.service";
import { StandardCoinName } from "../../../coin";
import { AnyNetwork } from "../../../networks/network";
import { BTCTransactionProvider } from "../../../tx-providers/btc/btc.transaction.provider";
import { TransactionProvider } from "../../../tx-providers/transaction.provider";
import { StandardEVMSubWallet } from "../../evm.subwallet";
import { StandardMasterWallet } from "../../masterwallet";
import { WalletAddressInfo } from "../../networkwallet";
import { StandardNetworkWallet } from "../../standardnetworkwallet";
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

    public getDisplayTokenName(): string {
        return 'BTC';
    }

    public getAverageBlocktime(): number {
        return 600;
    }
}
