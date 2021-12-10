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
import { BridgeProvider } from '../model/earn/bridgeprovider';
import { Network } from '../model/networks/network';
import { ERC20SubWallet } from '../model/wallets/erc20.subwallet';
import { AnySubWallet } from '../model/wallets/subwallet';
import { WalletNetworkService } from './network.service';

/**
 * Service responsible for managing token bridge features (bridge across different networks)
 *
 * Analysis:
 *
 */
@Injectable({
    providedIn: 'root'
})
export class BridgeService {
    public static instance: BridgeService = null;

    /**
     * List of associated tokens on different networks. Used to suggest user that they can possibly
     * bridge and stake there.
     *
     * TODO: later
     */
    /* private tokensMapping = [
        [
            // USDC
            { network: "heco", contract: "0x9362bbef4b8313a8aa9f0c9808b80577aa26b73b" },
            { network: "bsc", contract: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d" }
        ]
    ] */

    constructor(
        public networkService: WalletNetworkService,
        public dappbrowserService: DappBrowserService,
    ) {
        BridgeService.instance = this;
    }

    // TODO: optimize performance
    public getAvailableBridgeProviders(subWallet: AnySubWallet): BridgeProvider[] {
        let network = subWallet.networkWallet.network;

        if (subWallet.isStandardSubWallet()) {
            let possibleProviders = network.bridgeProviders.filter(p => p.canBridgeNativeToken);
            return possibleProviders;
        }
        else {
            // ERC20
            let erc20SubWallet = subWallet as ERC20SubWallet;
            let possibleProviders = network.bridgeProviders.filter(p => {
                return p.bridgeableTokenContracts.indexOf(erc20SubWallet.coin.getContractAddress()) >= 0;
            });
            return possibleProviders;
        }
    }

    /**
     * As not all bridge providers can bridge to all networks, this method returns the possible target
     * networks for a provider. Those target networks are found by browsing all networks and checking if they
     * are using the same base provider.
     */
    public getDestinationNetworksForProvider(bridgeProvider: BridgeProvider, sourceNetwork: Network): Network[] {
        let availableNetworks = this.networkService.getAvailableNetworks();
        let targetNetworks = availableNetworks.filter(n => {
            if (n.key === sourceNetwork.key)
                return false; // Filter out the source network;

            return !!n.bridgeProviders.find(bp => bp.baseProvider == bridgeProvider.baseProvider);
        });
        return targetNetworks;
    }

    public openBridgeProvider(provider: BridgeProvider, subWallet?: AnySubWallet) {
        // Use the swap url (more accurate), if any, otherwise the default project url
        let targetUrl = provider.bridgeUrl || provider.baseProvider.projectUrl;

        void this.dappbrowserService.openForBrowseMode(targetUrl, provider.baseProvider.name);
    }
}
