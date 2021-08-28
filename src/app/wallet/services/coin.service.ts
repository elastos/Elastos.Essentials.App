/*
 * Copyright (c) 2020 Elastos Foundation
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
import { Coin, CoinID, CoinType, ERC20Coin, StandardCoinName } from '../model/Coin';
import { LocalStorage } from './storage.service';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { WalletPrefsService } from './pref.service';
import { NetworkWallet } from '../model/wallets/networkwallet';
import { WalletNetworkService } from './network.service';
import { Network } from '../model/networks/network';

@Injectable({
    providedIn: 'root'
})
export class CoinService {
    public static instance: CoinService = null;
    private availableCoins: Map<string, Coin[]> = new Map(); // Map of network key -> coins
    private deletedERC20Coins: Map<string, ERC20Coin[]> = new Map(); // Map of network key -> coins
    private activeNetworkTemplate: string;

    constructor(
        private storage: LocalStorage,
        private events: Events,
        private networkService: WalletNetworkService,
        private prefs: WalletPrefsService)
    {
        CoinService.instance = this;
    }

    public init() {
        this.activeNetworkTemplate = this.prefs.getNetworkTemplate();

        this.networkService.activeNetwork.subscribe(activeNetwork => {
            if (activeNetwork) {
                void this.refreshCoins(activeNetwork);
            }
        });
    }

    private async refreshCoins(network: Network) {
        Logger.log("wallet", "Coin service - refreshing available coins");

        let availableCoins = [];

        // Add default ERC20 tokens built-in essentials
        availableCoins = network.getBuiltInERC20Coins(this.activeNetworkTemplate);

        // Add custom ERC20 tokens, manually added by the user or discovered
        availableCoins = [...availableCoins, ...await this.getCustomERC20Coins(network)];

        await this.initDeletedCustomERC20Coins(network);

        Logger.log('wallet', "Available coins for network "+network.key+":", this.availableCoins);
        Logger.log('wallet', "Deleted coins for network "+network.key+":", this.deletedERC20Coins);
    }

    public getAvailableCoins(network: Network): Coin[] {
        // Return only coins that are usable on the active network.
        return this.availableCoins.get(network.key).filter(c => {
            return c.networkTemplate == null || c.networkTemplate === this.activeNetworkTemplate;
        });
    }

    public getAvailableERC20Coins(network: Network): ERC20Coin[] {
        // Return only ERC20 coins that are usable on the active network.
        return this.availableCoins.get(network.key).filter(c => {
            return (c.networkTemplate == null || c.networkTemplate === this.activeNetworkTemplate) && (c.getType() === CoinType.ERC20);
        }) as ERC20Coin[];
    }

    public getCoinByID(network: Network, id: CoinID): Coin {
        return this.getAvailableCoins(network).find((c) => {
            return c.getID() === id;
        });
    }

    public getERC20CoinByContractAddress(network: Network, address: string): ERC20Coin | null {
        return this.getAvailableERC20Coins(network).find((c) => {
            return c.getContractAddress().toLowerCase() === address.toLowerCase();
        }) || null;
    }

    public coinAlreadyExists(network: Network, address: string): boolean {
        return this.getERC20CoinByContractAddress(network, address) != null;
    }

    public isCoinDeleted(network: Network, address: string) {
        for (let coin of this.deletedERC20Coins.get(network.key)) {
            if (coin.getContractAddress().toLowerCase() === address.toLowerCase()) return true;
        }
        return false;
    }

    /**
     * Adds a custom ERC20 coin to the list of available coins.
     * The new coin is activated in all the wallets passed as activateInWallets.
     *
     * Returns true if the coin was added, false otherwise (already existing or error).
     */
    public async addCustomERC20Coin(network: Network, erc20Coin: ERC20Coin, activateInWallets?: NetworkWallet[]): Promise<boolean> {
        Logger.log('wallet', "Adding coin to custom ERC20 coins list", erc20Coin);

        const existingCoins = await this.getCustomERC20Coins(network);
        existingCoins.push(erc20Coin);

        if (this.coinAlreadyExists(network, erc20Coin.getContractAddress())) {
            Logger.log('wallet', "Not adding coin, it already exists", erc20Coin);
            return false;
        }

        // Add to the available coins list
        this.availableCoins.get(network.key).push(erc20Coin);

        // Save to permanent storage
        await this.storage.set("custom-erc20-coins-"+network.key, existingCoins);

        this.deletedERC20Coins.set(network.key, this.deletedERC20Coins.get(network.key).filter((coin) => coin.getContractAddress().toLowerCase() !== coin.getContractAddress().toLowerCase()));
        await this.storage.set("custom-erc20-coins-deleted-"+network.key, this.deletedERC20Coins);

        // Activate this new coin in all wallets
        for (let wallet of activateInWallets) {
            // Make sure user has the ETH sidechain enabled
            if (!wallet.hasSubWallet(StandardCoinName.ETHSC)) {
                console.warn("Wallet doesn't have ESC. No activating the new ERC token");
                continue;
            }

            await wallet.createNonStandardSubWallet(erc20Coin);
        }

        this.events.publish("custom-coin-added", erc20Coin.getID());

        return true;
    }



    TODO: SHOULD WE DELETE THIS SERVICE AND MOVE THIS IN NETWORK AND NETWORKWALLET CLASSES?
    TODO: SHOULD WE DELETE THIS SERVICE AND MOVE THIS IN NETWORK AND NETWORKWALLET CLASSES?
    TODO: SHOULD WE DELETE THIS SERVICE AND MOVE THIS IN NETWORK AND NETWORKWALLET CLASSES?
    TODO: SHOULD WE DELETE THIS SERVICE AND MOVE THIS IN NETWORK AND NETWORKWALLET CLASSES?
    TODO: SHOULD WE DELETE THIS SERVICE AND MOVE THIS IN NETWORK AND NETWORKWALLET CLASSES?



    public async deleteERC20Coin(network: Network, erc20Coin: ERC20Coin) {
        this.availableCoins.set(network.key, this.availableCoins.get(network.key).filter((coin) => coin.getID() !== erc20Coin.getID()));
        let allCustomERC20Coins = await this.getCustomERC20Coins(network);
        allCustomERC20Coins = allCustomERC20Coins.filter((coin) => coin.getContractAddress().toLowerCase() !== erc20Coin.getContractAddress().toLowerCase());
        await this.storage.set("custom-erc20-coins-"+network.key, allCustomERC20Coins);
        Logger.log('wallet', 'availableCoins after deleting', this.availableCoins);

        this.deletedERC20Coins.get(network.key).push(erc20Coin);
        await this.storage.set("custom-erc20-coins-deleted-"+network.key, this.deletedERC20Coins);

        this.events.publish("custom-coin-deleted");
    }

    public async getCustomERC20Coins(activeNetwork: Network): Promise<ERC20Coin[]> {
        const rawCoinList = await this.storage.get("custom-erc20-coins-"+activeNetwork.key);
        if (!rawCoinList) {
            return [];
        }

        const customCoins: ERC20Coin[] = [];
        for (let rawCoin of rawCoinList) {
            customCoins.push(ERC20Coin.fromJson(rawCoin));
        }

        return customCoins;
    }

    private async initDeletedCustomERC20Coins(network: Network): Promise<ERC20Coin[]> {
        const rawCoinList = await this.storage.get("custom-erc20-coins-deleted-"+network.key);
        if (!rawCoinList) {
            return [];
        }

        let deletedERC20Coins: ERC20Coin[] = [];
        for (let rawCoin of rawCoinList) {
            deletedERC20Coins.push(ERC20Coin.fromJson(rawCoin));
        }

        this.deletedERC20Coins.set(network.key, deletedERC20Coins);
    }
}
