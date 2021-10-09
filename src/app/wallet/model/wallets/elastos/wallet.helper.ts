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

    /* if (internalAddress) {
      Logger.log("wallet", 'get Transaction for internal Address');
    } else {
      Logger.log("wallet", 'get Transaction for external Address');
    } */

    let addressArray = null;
    do {
      addressArray = await subWallet.masterWallet.walletManager.spvBridge.getAllAddresses(
        subWallet.masterWallet.id, subWallet.id, startIndex, 150, internalAddress);
      if (addressArray.Addresses.length === 0) {
        break;
      }
      if ((startIndex === 0) && !internalAddress && (subWallet.id === StandardCoinName.ELA)) {
        // OwnerAddress: for register dpos node, CRC.
        const ownerAddress = await WalletHelper.getOwnerAddress(subWallet);
        addressArray.Addresses.push(ownerAddress);
      }

      startIndex += addressArray.Addresses.length;

      try {
        const txRawList = await GlobalElastosAPIService.instance.getTransactionsByAddress(subWallet.id as StandardCoinName, addressArray.Addresses, transactionLimit, 0, timestamp);
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