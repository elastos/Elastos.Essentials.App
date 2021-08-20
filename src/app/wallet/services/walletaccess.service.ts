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
import { IntentTransfer } from './cointransfer.service';

@Injectable({
    providedIn: 'root'
})

export class WalletAccessService {

    /******************
     * Dynamic Values *
     ******************/

    // Define transfer type
    public masterWalletId: string;
    // From subwallet
    public elastosChainCode: StandardCoinName;
    // To subwallet (only for recharging funds)
    public toElastosChainCode: string;
    // TODO define requestField
    public requestFields: any;


    /******************
    * Intent Values *
    ******************/

    // Intent params
    public intentTransfer: IntentTransfer;

    constructor() {
        this.reset();
    }

    /**
     * Resets all service fields to their default value.
     */
    public reset() {
        this.masterWalletId = null;
        this.elastosChainCode = null;
        this.toElastosChainCode = null;
        this.intentTransfer = null;
        this.requestFields = null;
    }
}
