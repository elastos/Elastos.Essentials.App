import { StandardCoinName } from "../../coin";
import { Network } from "../../networks/network";
import { TransactionProvider } from "../../providers/transaction.provider";
import { StandardEVMSubWallet } from "../evm.subwallet";
import { MasterWallet } from "../masterwallet";
import { NetworkWallet, WalletAddressInfo } from "../networkwallet";
import { BTCSubWallet } from "./btc.subwallet";
import { BTCTransactionProvider } from "./providers/btc.transaction.provider";


/**
 * Network wallet type for standard EVM networks
 */
export class BTCNetworkWallet extends NetworkWallet {
    // private mainTokenSubWallet: StandardEVMSubWallet = null;

    constructor(
        public masterWallet: MasterWallet,
        public network: Network,
    ) {
        super(masterWallet, network, 'BTC');
    }

    protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
        return new BTCTransactionProvider(this);
    }

    protected async prepareStandardSubWallets(): Promise<void> {
        await this.masterWallet.walletManager.spvBridge.createSubWallet(this.masterWallet.id, StandardCoinName.BTC);
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

    public getMainEvmSubWallet(): StandardEVMSubWallet {
        return null;
    }

    public getDisplayTokenName(): string {
        return 'BTC';
    }

    public getAverageBlocktime(): number {
        return 600;
    }
}
