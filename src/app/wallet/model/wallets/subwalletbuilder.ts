import { Logger } from "src/app/logger";
import { Coin, CoinType } from "../coin";
import { ERC20SubWallet } from "./erc20.subwallet";
import { NetworkWallet } from "./networkwallet";
import { SerializedSubWallet, SubWallet } from "./subwallet";

export class SubWalletBuilder {
    /**
     * Newly created wallet, base on a coin type.
     */
    static newFromCoin(networkWallet: NetworkWallet, coin: Coin): Promise<SubWallet<any>> {
        Logger.log("wallet", "Creating new subwallet using coin", coin);

        switch (coin.getType()) {
            /* case CoinType.STANDARD:
                return StandardSubWalletBuilder.newFromCoin(networkWallet.masterWallet, coin); */
            case CoinType.ERC20:
                return ERC20SubWallet.newFromCoin(networkWallet, coin);
            default:
                Logger.warn('wallet', "Unsupported coin type", coin.getType());
                break;
        }
    }

    /**
     * Restored wallet from local storage info.
     */
    static newFromSerializedSubWallet(networkWallet: NetworkWallet, serializedSubWallet: SerializedSubWallet): SubWallet<any> {
        if (!serializedSubWallet)
            return null; // Should never happen, but happened because of some other bugs.

        switch (serializedSubWallet.type) {
            /* case CoinType.STANDARD:
                return StandardSubWalletBuilder.newFromSerializedSubWallet(networkWallet.masterWallet, serializedSubWallet); */
            case CoinType.ERC20:
                return ERC20SubWallet.newFromSerializedSubWallet(networkWallet, serializedSubWallet);
            default:
                Logger.warn('wallet', "Unsupported subwallet type", serializedSubWallet.type);
                break;
        }
    }
}