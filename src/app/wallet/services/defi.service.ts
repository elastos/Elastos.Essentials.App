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
import { DappBrowserService } from 'src/app/dappbrowser/services/dappbrowser.service';
import { Logger } from 'src/app/logger';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';

export type StakingData = {
    farmName: string;
    farmShortName: string;
    farmUrl: string;
    farmIconUrl: string;
    amountUSD: number;
    lastUpdated: number;
};

@Injectable({
    providedIn: 'root'
})
export class DefiService {
    public static instance: DefiService = null;

    private stakingAssetsUrl = 'https://essentials-api.trinity-tech.io/api/v1/assets/staking'

    constructor(
        public dappbrowserService: DappBrowserService,
        public jsonRPCService: GlobalJsonRPCService,
    ) {
        DefiService.instance = this;
    }

    public async getStakingAssets(address: string, chainId: number): Promise<StakingData[]> {
        let requestUrl = this.stakingAssetsUrl + '?address=' + address + '&chainid=' + chainId;
        try {
            let rawResult = await this.jsonRPCService.httpGet(requestUrl);
            let stakingAssets = rawResult.filter(asset => {
                return asset.amountUSD > 0;
            })
            return stakingAssets;
        }
        catch (err) {
            Logger.error('wallet', 'getStakingAssets error:', err)
            return null;
        }
    }

    public openStakeApp(farm: StakingData) {
        void this.dappbrowserService.open(farm.farmUrl, farm.farmName);
    }

    public openStakedAssetsProvider(walletAddress: string) {
        void this.dappbrowserService.open("https://tin.network", "Tin.Network");
    }
}
