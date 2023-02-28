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
import { NFT } from '../model/networks/evms/nfts/nft';
import { NetworkInfo } from '../pages/wallet/coin/coin-select/coin-select.page';

export class Transfer {
    masterWalletId: string = null;
    action: string = null;
    intentId: number = null;
    memo = '';
    did: string = null;
    nickname: string = null;
    url: string = null;
    crPublicKey: string = null;
    account: string = null;
    // rawTransaction: any = null;
    location: number = null;
    crDID: string = null;
    from: string = null;
    fee = 0;
    subWalletId: string = null;
    votes: any; // TODO
    amount: number;
    publickey: string;
    toAddress = '';
    publicKeys: any;
    didrequest: string;
    // type: string = 'payment-confirm';
    toSubWalletId: string;
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
    WITHDRAW = 4,
    SEND_NFT = 5, // Send a ERC721 or ERC1155 NFT
    FREEZE = 6,
    UNFREEZE = 7
}
export class ContractPayloadParam {
    data: string = null;
    from: string = null;
    gas: string = null;
    gasPrice: string = null;
    to: string = null;
    value: string = null;
}

type NFTTransfer = {
    nft: NFT; // Mostly, the NFT contract address
    assetID: string; // Asset ID inside the contract, to be transferred
}
@Injectable({
    providedIn: 'root'
})

export class CoinTransferService {

    /******************
     * Dynamic Values *
     ******************/

    // Send, receive, transfer, send nft...
    public transferType: TransferType;
    // Main master wallet on which to operate
    public masterWalletId: string;
    // From subwallet
    public subWalletId: string;
    // To subwallet (only for recharging funds)
    public toSubWalletId: string;
    // To Network infomation (only for recharging funds), the multi-sign wallet doesn't support sidechain,
    // so we can't get the to subwallet, user only select the destination Network.
    public networkInfo: NetworkInfo;

    /******************
    * Intent Values *
    ******************/

    // Intent params
    public intentTransfer: IntentTransfer;
    // intent: pay
    public payTransfer: PayTransfer;
    // intent: dposvotetransaction
    public publickeys: any;
    // intent: didtransaction
    public didrequest: any;
    // intent: esctransaction
    public sendTransactionChainId: number; // For esctransaction intents, optional "chainid" numeric value representing the EVM chain to send transaction to.
    public payloadParam: ContractPayloadParam;
    // NFT transfer info
    public nftTransfer: NFTTransfer;

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

        this.transferType = null;
        this.masterWalletId = null;
        this.subWalletId = null;
        this.toSubWalletId = null;
        this.intentTransfer = new IntentTransfer();
        this.payTransfer = new PayTransfer();
        this.publickeys = null;
        this.didrequest = null;
    }
}
