import { WalletNetworkOptions } from "src/app/wallet/model/masterwallets/wallet.types";
import { StandardCoinName } from "../../../../coin";
import { StandardMasterWallet } from "../../../../masterwallets/masterwallet";
import { WalletJSSDKHelper } from "../../../elastos/wallet.jssdk.helper";
import { AnyNetwork } from "../../../network";
import { BTCSPVSDKSafe } from "../../safes/btc.spvsdk.safe";
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
            new BTCSPVSDKSafe(masterWallet, "BTC"),
        );
    }

    public async initialize(): Promise<void> {
        if (!await WalletJSSDKHelper.maybeCreateStandardWalletFromJSWallet(this.masterWallet))
            return;

        await super.initialize();
    }

    protected async prepareStandardSubWallets(): Promise<void> {
        await WalletJSSDKHelper.createSubWallet(this.masterWallet.id, StandardCoinName.BTC);
        this.subWallets[StandardCoinName.BTC] = new BTCSubWallet(this, this.network.getRPCUrl());
        await this.subWallets[StandardCoinName.BTC].initialize();
    }
}
