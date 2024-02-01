import { BitcoinAddressType } from "src/app/wallet/model/btc.types";
import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { WalletNetworkOptions } from "src/app/wallet/model/masterwallets/wallet.types";
import { StandardCoinName } from "../../../../coin";
import { BTCLedgerSafe } from "../../safes/ledger/btc.ledger.safe";
import { BTCSubWallet } from "../../subwallets/btc.subwallet";
import { BTCNetworkWallet } from "../btc.networkwallet";
import { AnyNetwork } from "../../../network";

/**
 * Network wallet type for the bitcoin network
 */
export class LedgerBTCNetworkWallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends BTCNetworkWallet<LedgerMasterWallet, WalletNetworkOptionsType> {
    constructor(public masterWallet: LedgerMasterWallet, public network: AnyNetwork, public bitcoinAddressType: BitcoinAddressType) {
        super(
            masterWallet,
            network,
            bitcoinAddressType,
            new BTCLedgerSafe(masterWallet),
        );
    }

    protected async prepareStandardSubWallets(): Promise<void> {
        this.subWallets[StandardCoinName.BTC] = new BTCSubWallet(this, this.network.getRPCUrl());
        await this.subWallets[StandardCoinName.BTC].initialize();
    }
}
