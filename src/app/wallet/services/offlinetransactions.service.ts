/*
 * Copyright (c) 2021 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { AnySubWallet } from '../model/networks/base/subwallets/subwallet';
import { AnyOfflineTransaction } from '../model/tx-providers/transaction.types';

/**
 * Service that manages (stores, loads, serves) offline transactions used by wallets.
 * This is mainly used by multisig wallets in order to temporarily save transactions locally, while they
 * are not published on chain. Usually, after discovering the matching published transaction, offline transactions
 * get deleted.
 */
@Injectable({
    providedIn: 'root'
})
export class OfflineTransactionsService {
    public static instance: OfflineTransactionsService = null;

    constructor() {
        OfflineTransactionsService.instance = this;
    }

    private getStorageKey(subWallet: AnySubWallet): string {
        return `${subWallet.id}_offlinetxs`;
    }

    public async getTransactions(subWallet: AnySubWallet): Promise<AnyOfflineTransaction[]> {
        let transactions = await subWallet.networkWallet.loadContextInfo<AnyOfflineTransaction[]>(this.getStorageKey(subWallet)) || [];
        return transactions;
    }

    /**
     * Inserts or updates an offline transaction, based on its transaction key.
     */
    public async storeTransaction(subWallet: AnySubWallet, offlineTransaction: AnyOfflineTransaction): Promise<void> {
        Logger.log("wallet", "Storing offline transaction", offlineTransaction);

        let transactions = await this.getTransactions(subWallet);

        // Remove existing, if any
        let existingTxIndex = transactions.findIndex(t => t.transactionKey === offlineTransaction.transactionKey);
        if (existingTxIndex >= 0) {
            transactions.splice(existingTxIndex, 1);
        }

        transactions.push(offlineTransaction);
        await subWallet.networkWallet.saveContextInfo<AnyOfflineTransaction[]>(this.getStorageKey(subWallet), transactions);
    }

    public debugRemoveTransactions(subWallet: AnySubWallet): Promise<void> {
        return subWallet.networkWallet.saveContextInfo<AnyOfflineTransaction[]>(this.getStorageKey(subWallet), []);
    }
}
