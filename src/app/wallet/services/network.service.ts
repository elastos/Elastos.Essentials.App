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
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { ElastosNetwork } from '../model/networks/elastos/elastos.network';
import { HECONetwork } from '../model/networks/heco/heco.network';
import { Network } from '../model/networks/network';

@Injectable({
    providedIn: 'root'
})
export class WalletNetworkService {
    private networks: Network[] = [];

    public activeNetwork = new BehaviorSubject<Network>(null);

    constructor(private prefs: GlobalPreferencesService)
    {}

    public async init() {
        this.networks = [];

        let elastosNetwork = new ElastosNetwork();
        this.networks.push(elastosNetwork);
        this.networks.push(new HECONetwork());

        let currentNetwork = await this.prefs.getPreference(GlobalDIDSessionsService.signedInDIDString, 'activenetwork') as string;
        Logger.log("wallet", "WalletNetworkService - Reloading network:", currentNetwork);
        const network = await this.getNetworkByKey(currentNetwork);
        if (network) {
            this.activeNetwork.next(network);
        } else {
            this.activeNetwork.next(elastosNetwork);
        }
    }

    public getAvailableNetworks(): Network[] {
        return this.networks;
    }

    public async setActiveNetwork(network: Network) {
        // Save choice to persistent storage
        await this.prefs.setPreference(GlobalDIDSessionsService.signedInDIDString, 'activenetwork', network.key);
        Logger.log("wallet", "Setting active network to", network);
        this.activeNetwork.next(network);
    }

    public getNetworkByKey(key: string): Network {
        return this.networks.find(n => n.key === key);
    }
}
