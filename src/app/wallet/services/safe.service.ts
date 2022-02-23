/*
 * Copyright (c) 2020 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Injectable } from '@angular/core';
import { PrivateKeyType } from '../model/wallet.types';

export type StandardWalletSafe = {
    seed?: string;
    mnemonic?: string;
    privateKey?: string;
    privateKeyType?: PrivateKeyType;
}

/**
 * Service used to store sensitive wallet information such as seeds.
 * We use a dedicated memory-only object here to avoid storing (even encrypted) seeds and secret wallet keys
 * in wallet objects, as those object tend to be logged often. Secret wallet information should not be
 * output to logs.
 */
@Injectable({ providedIn: 'root' })
export class SafeService {
    public static instance: SafeService = null;

    private standardWalletSafes: { [walletId: string]: StandardWalletSafe } = {};

    constructor() {
        SafeService.instance = this;
    }

    /**
     * Gets a safe entry that is initialized with empty content if not yet existing.
     * This entry can be edited directly.
     */
    public getStandardWalletSafe(walletId: string): StandardWalletSafe {
        let safe = this.standardWalletSafes[walletId];
        if (!safe) {
            safe = {};
            this.standardWalletSafes[walletId] = safe;
        }

        return safe;
    }
}
