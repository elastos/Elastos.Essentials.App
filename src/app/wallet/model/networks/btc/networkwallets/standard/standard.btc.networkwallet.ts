import { WalletNetworkOptions } from "src/app/wallet/model/masterwallets/wallet.types";
import { StandardCoinName } from "../../../../coin";
import { StandardMasterWallet } from "../../../../masterwallets/masterwallet";
import { AnyNetwork } from "../../../network";
import { BTCWalletJSSafe } from "../../safes/btc.walletjs.safe";
import { BTCSubWallet } from "../../subwallets/btc.subwallet";
import { BTCNetworkWallet } from "../btc.networkwallet";

/**
 * Network wallet type for the bitcoin network
 */
export class StandardBTCNetworkWallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends BTCNetworkWallet<StandardMasterWallet, WalletNetworkOptionsType> {
    constructor(public masterWallet: StandardMasterWallet, public network: AnyNetwork) {
        super(
            masterWallet,
            network,
            new BTCWalletJSSafe(masterWallet, "BTC"),
        );
    }

    public async initialize(): Promise<void> {
        await super.initialize();
    }

    protected async prepareStandardSubWallets(): Promise<void> {
        this.subWallets[StandardCoinName.BTC] = new BTCSubWallet(this, this.network.getRPCUrl());
        await this.subWallets[StandardCoinName.BTC].initialize();
    }
}
