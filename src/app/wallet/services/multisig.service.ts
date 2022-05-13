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
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { environment } from 'src/environments/environment';
import { WalletNetworkService } from './network.service';

export type PendingMultiSigTransaction = {
    rawTransaction: any; // Partly signed transaction
    network: string; // network key for which this transaction is for
}

/**
 * Service that handles communication with the Essentials API in order to facilitates transfers of multi
 * signature transactions between cosigners.
 *
 * Using this service, a multisig tx creator can create a tx, store it on the backend, share a link to cosigners,
 * and cosigners can open that link into essentials to retrieve the transactions and sign it too.
 */
@Injectable({
    providedIn: 'root'
})
export class MultiSigService {
    public static instance: MultiSigService = null;

    constructor(
        private networksService: WalletNetworkService,
        private jsonRPCService: GlobalJsonRPCService
    ) {
        MultiSigService.instance = this;
    }

    /**
     * Checks if there is a pending multisig transaction to sign on the backend, given a unique transaction
     * identifier. This identifier is the key shared among cosigners to inform others that a transaction
     * has to be signed.
     *
     * The returned transaction is already signed by one or more cosigners.
     */
    public async fetchPendingTransaction(transactionKey: string): Promise<PendingMultiSigTransaction> {
        Logger.log("wallet", `Fetching multisig transaction ${transactionKey}`);

        let requestUrl = `${environment.EssentialsAPI.serviceUrl}/multisig/transaction?key=${transactionKey}`;
        try {
            let txInfo = await this.jsonRPCService.httpGet(requestUrl);
            return txInfo;
        }
        catch (err) {
            Logger.error('wallet', 'Multisig: fetchPendingTransaction() error:', err)
            return null;
        }
    }

    /**
     * Uploads a cosigner's signed transaction to the remote service so that other cosigners
     * can get it and continue to sign.
     */
    public async uploadSignedTransaction(transactionKey: string, signedTx: any): Promise<void> {
        Logger.log("wallet", `Uploading multisig transaction ${transactionKey}`, signedTx);

        let requestUrl = `${environment.EssentialsAPI.serviceUrl}/multisig/transaction?key=${transactionKey}`;
        try {
            await this.jsonRPCService.httpPost(requestUrl, {
                tx: signedTx,
                network: this.networksService.activeNetwork.value.key
            });
        }
        catch (err) {
            Logger.error('wallet', 'Multisig: uploadSignedTransaction() error:', err)
        }
    }
}
