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
import { StandardCoinName } from '../model/Coin';
import { WalletAccount } from '../model/WalletAccount';
import { WalletID } from '../model/wallets/MasterWallet';

export class Transfer {
    masterWalletId: WalletID = null;
    action: string = null;
    intentId: number = null;
    memo: string = '';
    did: string = null;
    nickname: string = null;
    url: string = null;
    crPublicKey: string = null;
    account: string = null;
    rawTransaction: any = null;
    location: number = null;
    crDID: string = null;
    from: string = null;
    fee: number = 0;
    elastosChainCode: string = null;
    votes: any; // TODO
    amount: number;
    publickey: string;
    toAddress: string = '';
    publicKeys: any;
    didrequest: string;
   // type: string = 'payment-confirm';
    toElastosChainCode: string;
    currency: string; // pay
    rate: number;
    payPassword: string;
}

export class IntentTransfer {
    action: string = null;
    intentId: any = null;
}

export class PayTransfer {
    toAddress = '';
    amount = 0;
    memo = '';
}

export enum TransferType {
    RECHARGE = 1, // Transfer between subwallets
    SEND = 2, // Sending
    PAY = 3, // Pay intent
    WITHDRAW = 4
}

export class ContractPayloadParam {
    data: string = null;
    from: string = null;
    gas: string = null;
    gasPrice: string = null;
    to: string = null;
    value: string = null;
}

@Injectable({
    providedIn: 'root'
})

export class CoinTransferService {

    /******************
     * Dynamic Values *
     ******************/

    // Define transfer type
    public transferType: TransferType;
    public masterWalletId: string;
    // From subwallet
    public elastosChainCode: StandardCoinName;
    // To subwallet (only for recharging funds)
    public toElastosChainCode: string;
    public walletInfo: WalletAccount;


    /******************
    * Intent Values *
    ******************/

    // Intent params
    public intentTransfer: IntentTransfer;
    // intent: pay
    public payTransfer: PayTransfer;
    // intent: dposvotetransaction
    public publickeys: any;
    // intent: crmembervote
    public crcvotes: any;
    // intent: didtransaction
    public didrequest: any;
    // intent: esctransaction
    public payloadParam: ContractPayloadParam;
    // public amount: number;

    // In the process of deprecating
    public transfer: Transfer = null;

    constructor() {
        this.reset();
    }

    /**
     * Resets all service fields to their default value to restart a new transfer.
     */
    public reset() {
        this.transfer = new Transfer();

        this.walletInfo = new WalletAccount();
        this.transferType = null;
        this.masterWalletId = null;
        this.elastosChainCode = null;
        this.toElastosChainCode = null;
        this.intentTransfer = new IntentTransfer();
        this.payTransfer = new PayTransfer();
        this.publickeys = null;
        this.crcvotes = null;
        this.didrequest = null;
    }
}
