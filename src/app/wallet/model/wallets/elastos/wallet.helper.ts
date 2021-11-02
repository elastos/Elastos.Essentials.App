import { Logger } from "src/app/logger";
import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { StandardCoinName } from "../../coin";
import { ElastosTransaction, PaginatedTransactions } from "../../providers/transaction.types";
import { SubWallet } from "../subwallet";

export class WalletHelper {
  public static async getOwnerAddress(subWallet: SubWallet<any>): Promise<string> {
    return await subWallet.masterWallet.walletManager.spvBridge.getOwnerAddress(
      subWallet.masterWallet.id, subWallet.id);
  }

  public static async getTransactionByAddress(subWallet: SubWallet<any>, internalAddress: boolean, transactionLimit: number, timestamp = 0): Promise<PaginatedTransactions<ElastosTransaction>[]> {
    let startIndex = 0
    let txListTotal: PaginatedTransactions<ElastosTransaction>[] = [];

    let maxAddressCount = subWallet.getAddressCount(internalAddress);
    let count = 150;
    let addressArray = null;

    do {
        if (startIndex + count > maxAddressCount) {
            count = maxAddressCount - startIndex;
            if (count <= 0) {
                break;
            }
        }
        addressArray = await subWallet.masterWallet.walletManager.spvBridge.getAddresses(
                subWallet.masterWallet.id, subWallet.id, startIndex, count, internalAddress);
        if ((startIndex === 0) && !internalAddress && (subWallet.id === StandardCoinName.ELA)) {
            // OwnerAddress: for register dpos node, CRC.
            const ownerAddress = await WalletHelper.getOwnerAddress(subWallet);
            addressArray.push(ownerAddress);
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
    } while (!subWallet.masterWallet.account.SingleAddress);

    return txListTotal;
  }
}