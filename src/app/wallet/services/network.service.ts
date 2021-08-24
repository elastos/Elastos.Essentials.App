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
import { BehaviorSubject } from 'rxjs';
import { Logger } from 'src/app/logger';
import { StandardCoinName } from '../model/coin';
import { IntentTransfer } from './cointransfer.service';

export type WalletNetworkInfo = {
    key: string; // unique identifier
    name: string; // Human readable network name - Elastos, HECO
    logo: string; // Path to the network icon
}

const networksInfos: WalletNetworkInfo[] = [
    // Default
    {
        key: "elastos",
        name: 'Elastos',
        logo: 'assets/wallet/networks/elastos.svg',
    },
    // Others
    {
        key: "heco",
        name: 'HECO',
        logo: 'assets/wallet/networks/hecochain.png',
    },
];

@Injectable({
    providedIn: 'root'
})
export class WalletNetworkService {
    public activeNetwork = new BehaviorSubject<WalletNetworkInfo>(networksInfos[0]);

    constructor() {}

    public getAvailableNetworks(): WalletNetworkInfo[] {
        return networksInfos;
    }

    public setActiveNetwork(network: WalletNetworkInfo) {
        Logger.log("wallet", "Setting active network to", network);
        this.activeNetwork.next(network);
    }
}
