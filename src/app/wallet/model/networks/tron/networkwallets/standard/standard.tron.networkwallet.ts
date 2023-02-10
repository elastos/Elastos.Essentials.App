import { StandardCoinName } from "src/app/wallet/model/coin";
import { WalletNetworkOptions } from "src/app/wallet/model/masterwallets/wallet.types";
import { StandardMasterWallet } from "../../../../masterwallets/masterwallet";
import { AnyNetwork } from "../../../network";
import { TronWalletJSSafe } from "../../safes/tron.walletjs.safe";
import { TronSubWallet } from "../../subwallets/tron.subwallet";
import { TronNetworkWallet } from "../tron.networkwallet";

/**
 * Network wallet type for the tron network
 */
export class StandardTronNetworkWallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends TronNetworkWallet<StandardMasterWallet, WalletNetworkOptionsType> {
    protected mainTokenSubWallet: TronSubWallet = null;

    constructor(public masterWallet: StandardMasterWallet, public network: AnyNetwork) {
        super(
            masterWallet,
            network,
            new TronWalletJSSafe(masterWallet, StandardCoinName.TRON),
        );
    }

    protected async prepareStandardSubWallets(): Promise<void> {
        this.mainTokenSubWallet = new TronSubWallet(this, this.network.getRPCUrl());
        await this.mainTokenSubWallet.initialize();
        this.subWallets[StandardCoinName.TRON] = this.mainTokenSubWallet;
    }
}
