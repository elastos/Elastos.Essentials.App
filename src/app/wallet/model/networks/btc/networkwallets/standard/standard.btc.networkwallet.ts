import { BitcoinAddressType } from "src/app/wallet/model/btc.types";
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
    constructor(public masterWallet: StandardMasterWallet, public network: AnyNetwork, public bitcoinAddressType: BitcoinAddressType) {
        super(
            masterWallet,
            network,
            new BTCWalletJSSafe(masterWallet, "BTC", bitcoinAddressType),
        );
    }

    protected async prepareStandardSubWallets(): Promise<void> {
        this.subWallets[StandardCoinName.BTC] = new BTCSubWallet(this, this.network.getRPCUrl());
        await this.subWallets[StandardCoinName.BTC].initialize();
    }
}
