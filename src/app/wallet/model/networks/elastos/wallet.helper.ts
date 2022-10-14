import { Logger } from "src/app/logger";
import { Util } from "src/app/model/util";
import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { StandardCoinName } from "../../coin";
import { ElastosMainChainWalletNetworkOptions } from "../../masterwallets/wallet.types";
import { AddressUsage } from "../../safes/addressusage";
import { ElastosTransaction, PaginatedTransactions } from "../../tx-providers/transaction.types";
import { AnySubWallet, SubWallet } from "../base/subwallets/subwallet";
import { MainChainWalletJSSafe } from "./mainchain/safes/mainchain.walletjs.safe";

export class WalletHelper {
    /**
     * Creates a master wallet ID for SPV wallets.
     */
    public static createSPVMasterWalletId(): string {
        return Util.uuid(6, 16);
    }

    public static getOwnerAddress(subWallet: AnySubWallet): string {
        return (subWallet.networkWallet.safe as MainChainWalletJSSafe).getOwnerAddress();
    }

    public static async getTransactionByAddress(subWallet: SubWallet<any, ElastosMainChainWalletNetworkOptions>, internalAddress: boolean, transactionLimit: number, timestamp = 0): Promise<PaginatedTransactions<ElastosTransaction>[]> {
        let startIndex = 0
        let txListTotal: PaginatedTransactions<ElastosTransaction>[] = [];

        let maxAddressCount = subWallet.getAddressCount(internalAddress);
        let count = 150;
        let addressArray: string[] = null;

        do {
            if (startIndex + count > maxAddressCount) {
                count = maxAddressCount - startIndex;
                if (count <= 0) {
                    break;
                }
            }
            addressArray = subWallet.networkWallet.safe.getAddresses(
                startIndex, count, internalAddress, AddressUsage.DEFAULT);
            if ((startIndex === 0) && !internalAddress && (subWallet.id === StandardCoinName.ELA)) {
                // OwnerAddress: for register dpos node, CRC.
                const ownerAddress = WalletHelper.getOwnerAddress(subWallet);
                if (ownerAddress) addressArray.push(ownerAddress);
            }

            startIndex += addressArray.length;
            try {
                const txRawList = await GlobalElastosAPIService.instance.getTransactionsByAddress(subWallet.id as StandardCoinName, addressArray, transactionLimit, 0, timestamp);
                if (txRawList && txRawList.length > 0) {
                    for (let i = 0, len = txRawList.length; i < len; i++) {
                        txListTotal.push({
                            total: txRawList[i].result.totalcount,
                            transactions: txRawList[i].result.txhistory
                        });
                    }
                }
            } catch (e) {
                Logger.log("wallet", 'getTransactionByAddress exception:', e);
                throw e;
            }
        } while (!subWallet.networkWallet.getNetworkOptions().singleAddress);

        return txListTotal;
    }
}