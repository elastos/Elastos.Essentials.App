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
import { Network } from '../model/networks/network';
import { LocalStorage } from './storage.service';

@Injectable({
    providedIn: 'root'
})
export class WalletNetworkService {
    public static instance: WalletNetworkService = null;

    private networks: Network[] = [];

    public activeNetwork = new BehaviorSubject<Network>(null);

    constructor(private localStorage: LocalStorage)
    {
      WalletNetworkService.instance = this;
    }

    public init() {}

    /**
     * Appends a usable network to the list. We let networks register themselves, we don't
     * use networks in this service, to avoid circular dependencies.
     */
    public async registerNetwork(network: Network, useAsDefault = false): Promise<void> {
        this.networks.push(network);

        let savedNetworkKey = await this.localStorage.get('activenetwork') as string;
        const savedNetwork = await this.getNetworkByKey(savedNetworkKey);
        if (!savedNetwork && useAsDefault) {
            Logger.log("wallet", "WalletNetworkService - Using default network:", savedNetwork);
            this.activeNetwork.next(network); // Normally, elastos
        }
        else if (savedNetworkKey && savedNetworkKey === network.key) {
            Logger.log("wallet", "WalletNetworkService - Reloading network:", savedNetwork);
            this.activeNetwork.next(savedNetwork);
        }
    }

    public getAvailableNetworks(): Network[] {
        return this.networks;
    }

    public async setActiveNetwork(network: Network) {
        Logger.log("wallet", "Setting active network to", network);
        // Save choice to local storage
        await this.localStorage.set('activenetwork', network.key);
        this.activeNetwork.next(network);
    }

    public getNetworkByKey(key: string): Network {
        return this.networks.find(n => n.key === key);
    }

    /**
     * Tells if the currently active network is the elastos network.
     */
    public isActiveNetworkElastos(): boolean {
        return this.activeNetwork.value.key === "elastos";
    }
}
