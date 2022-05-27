import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { WalletNetworkOptions } from "src/app/wallet/model/masterwallets/wallet.types";
import { StandardCoinName } from "../../../../coin";
import { AnyNetwork } from "../../../network";
import { BTCLedgerSafe } from "../../safes/ledger/btc.ledger.safe";
import { BTCSubWallet } from "../../subwallets/btc.subwallet";
import { BTCNetworkWallet } from "../btc.networkwallet";

/**
 * Network wallet type for the bitcoin network
 */
export class LedgerBTCNetworkWallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends BTCNetworkWallet<LedgerMasterWallet, WalletNetworkOptionsType> {
    constructor(public masterWallet: LedgerMasterWallet, public network: AnyNetwork) {
        super(
            masterWallet,
            network,
            new BTCLedgerSafe(masterWallet),
        );
    }

    protected async prepareStandardSubWallets(): Promise<void> {
        this.subWallets[StandardCoinName.BTC] = new BTCSubWallet(this, this.network.getRPCUrl());
        await this.subWallets[StandardCoinName.BTC].initialize();
    }
}
