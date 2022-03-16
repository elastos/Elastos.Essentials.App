import { WalletNetworkOptions } from "src/app/wallet/model/masterwallets/wallet.types";
import { jsToSpvWalletId, SPVService } from "src/app/wallet/services/spv.service";
import { StandardCoinName } from "../../../../coin";
import { StandardMasterWallet } from "../../../../masterwallets/masterwallet";
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
        if (!await SPVService.instance.maybeCreateStandardSPVWalletFromJSWallet(this.masterWallet))
            return;

        await super.initialize();
    }

    protected async prepareStandardSubWallets(): Promise<void> {
        await SPVService.instance.createSubWallet(jsToSpvWalletId(this.masterWallet.id), StandardCoinName.BTC);
        this.subWallets[StandardCoinName.BTC] = new BTCSubWallet(this, this.network.getMainEvmRpcApiUrl());
        await this.subWallets[StandardCoinName.BTC].initialize();
    }
}
