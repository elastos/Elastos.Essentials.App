import { Logger } from "src/app/logger";
import type { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { TransactionInfoType } from "../../../tx-providers/transaction.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import type { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { CosmosNetwork } from "../../cosmos/cosmos.network";
import { AtomAPI, AtomApiType } from "./atom.api";

export class AtomBaseNetwork extends CosmosNetwork {
    protected async newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet> {
        switch (masterWallet.type) {
        case WalletType.STANDARD:
            const AtomNetworkWallet = (await import("../networkwallets/standard/atom.network.wallet")).AtomNetworkWallet;
            return new AtomNetworkWallet(
                masterWallet as StandardMasterWallet,
                this,
                this.getMainTokenSymbol(),
                this.mainTokenFriendlyName,
                this.addressPrefix,
                this.hdPath
            );
        default:
            return null;
        }
    }

    public getAPIUrlOfType(type: NetworkAPIURLType): string {
        if (type === NetworkAPIURLType.RPC)
            return AtomAPI.getApiUrl(AtomApiType.RPC, this.networkTemplate);
        else if (type === NetworkAPIURLType.BLOCK_EXPLORER)
            return AtomAPI.getApiUrl(AtomApiType.BLOCK_EXPLORER, this.networkTemplate);
        else
            throw new Error(`AtomNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
    }

    /**
     * User can view information directly on an external browser.
     */
    public getBrowserUrlByType(type: TransactionInfoType, value: string): string {
        let browserUrl = this.getAPIUrlOfType(NetworkAPIURLType.BLOCK_EXPLORER);
        switch (type) {
            case TransactionInfoType.ADDRESS:
                browserUrl += '/accounts/'
            break;
            case TransactionInfoType.BLOCKID:
                browserUrl += '/blocks/'
            break;
            case TransactionInfoType.TXID:
                browserUrl += '/transactions/'
            break;
            default:
                Logger.warn("wallet", "getBrowserUrlByType: not support ", type);
            break;
        }
        return browserUrl + value;
    }

    public getMainColor(): string {
        return "141629";
    }
}
