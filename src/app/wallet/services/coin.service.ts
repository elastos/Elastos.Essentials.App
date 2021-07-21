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
import { Coin, CoinID, CoinType, ERC20Coin, StandardCoin } from '../model/Coin';
import { StandardCoinName } from '../model/Coin';
import { LocalStorage } from './storage.service';
import { MasterWallet } from '../model/wallets/MasterWallet';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { WalletPrefsService } from './pref.service';
import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from 'src/app/services/global.networks.service';

@Injectable({
    providedIn: 'root'
})
export class CoinService {
    private availableCoins: Coin[] = null;
    private deletedERC20Coins: ERC20Coin[] = null;
    private activeNetworkTemplate: string;

    constructor(private storage: LocalStorage, private events: Events, private prefs: WalletPrefsService) {
    }

    public async init() {
        this.availableCoins = [];
        this.deletedERC20Coins = [];

        this.activeNetworkTemplate = this.prefs.getNetworkTemplate();

        // Standard tokens
        this.availableCoins.push(new StandardCoin(StandardCoinName.ELA, "ELA", "Elastos Main Chain"));
        this.availableCoins.push(new StandardCoin(StandardCoinName.IDChain, "ELA/ID", "Elastos DID"));
        this.availableCoins.push(new StandardCoin(StandardCoinName.ETHSC, "ELA/ESC", "Elastos ESC"));
        this.availableCoins.push(new StandardCoin(StandardCoinName.ETHDID, "ELA/EID", "Elastos EID"));
        // this.availableCoins.push(new StandardCoin(StandardCoinName.ETHHECO, "ELA/ETHHECO", "HECO"));

        // ERC20 tokens
        this.availableCoins.push(new ERC20Coin("TTECH", "TTECH", "Trinity Tech", "0xa4e4a46b228f3658e96bf782741c67db9e1ef91c", MAINNET_TEMPLATE, false));
        this.availableCoins.push(new ERC20Coin("TTECH", "TTECH", "Trinity Tech", "0xFDce7FB4050CD43C654C6ceCeAd950343990cE75", TESTNET_TEMPLATE, false));

        // Community ERC20 tokens - could be removed in the future - for now only to create some synergy
        //this.availableCoins.push(new ERC20Coin("APL", "APL", "Apple Token", "0x09046e26d8b4cf640323850786455cec8e6f665e", NetworkType.MainNet, false));
        //this.availableCoins.push(new ERC20Coin("BNA", "BNA", "Banana", "0x2fceb9e10c165ef72d5771a722e8ab5e6bc85015", NetworkType.MainNet, false));
        //this.availableCoins.push(new ERC20Coin("SUG", "SUG", "Sugarcane", "0xe272e043259bd2a4773c75768a5a56492c551291", NetworkType.MainNet, false));
        this.availableCoins.push(new ERC20Coin("DMA", "DMA", "DMA Token", "0x9c22cec60392cb8c87eb65c6e344872f1ead1115", MAINNET_TEMPLATE, false));
        //this.availableCoins.push(new ERC20Coin("TOK-LP-SUG", "TOK-LP-SUG", "Tokswap LP Token SUG", "0xcf9c63a11631e52e0b4d4d3fd3ea45fde3183bfe", NetworkType.MainNet, false));
        //this.availableCoins.push(new ERC20Coin("TOK-LP-APL", "TOK-LP-APL", "Tokswap LP Token APL", "0x4c18cc638df020ac1f1398d52ade77ed84d60f48", NetworkType.MainNet, false));
        //this.availableCoins.push(new ERC20Coin("TOK-LP-BNA", "TOK-LP-BNA", "Tokswap LP Token BNA", "0x593cd928586612c7196e1f8eecf23db43555cf44", NetworkType.MainNet, false));
        this.availableCoins.push(new ERC20Coin("ELP", "ELP", "Elaphant", "0x677d40ccc1c1fc3176e21844a6c041dbd106e6cd", MAINNET_TEMPLATE, false));

        // TMP DEBUG
        //await this.storage.set("custom-erc20-coins", []);

        await this.addCustomERC20CoinsToAvailableCoins();

        await this.initDeletedCustomERC20Coins();

        Logger.log('wallet', "Available coins:", this.availableCoins);
        Logger.log('wallet', "Deleted coins:", this.deletedERC20Coins);
    }

    public getAvailableCoins(): Coin[] {
        // Return only coins that are usable on the active network.
        return this.availableCoins.filter(c => {
            return c.networkTemplate == null || c.networkTemplate === this.activeNetworkTemplate;
        });
    }

    public getAvailableERC20Coins(): ERC20Coin[] {
        // Return only ERC20 coins that are usable on the active network.
        return this.availableCoins.filter(c => {
            return (c.networkTemplate == null || c.networkTemplate === this.activeNetworkTemplate) && (c.getType() === CoinType.ERC20);
        }) as ERC20Coin[];
    }

    public getCoinByID(id: CoinID): Coin {
        return this.getAvailableCoins().find((c) => {
            return c.getID() === id;
        });
    }

    public getERC20CoinByContracAddress(address: string): ERC20Coin | null {
        return this.getAvailableERC20Coins().find((c) => {
            return c.getContractAddress().toLowerCase() === address.toLowerCase();
        }) || null;
    }

    public coinAlreadyExists(address: string): boolean {
        return this.getERC20CoinByContracAddress(address) != null;
    }

    public isCoinDeleted(address: string) {
        for (let coin of this.deletedERC20Coins) {
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
    public async addCustomERC20Coin(erc20Coin: ERC20Coin, activateInWallets?: MasterWallet[]): Promise<boolean> {
        Logger.log('wallet', "Adding coin to custom ERC20 coins list", erc20Coin);

        const existingCoins = await this.getCustomERC20Coins();
        existingCoins.push(erc20Coin);

        if (this.coinAlreadyExists(erc20Coin.getContractAddress())) {
            Logger.log('wallet', "Not adding coin, it already exists", erc20Coin);
            return false;
        }

        // Add to the available coins list
        this.availableCoins.push(erc20Coin);

        // Save to permanent storage
        await this.storage.set("custom-erc20-coins", existingCoins);

        this.deletedERC20Coins = this.deletedERC20Coins.filter((coin) => coin.getContractAddress().toLowerCase() !== coin.getContractAddress().toLowerCase());
        await this.storage.set("custom-erc20-coins-deleted", this.deletedERC20Coins);

        // Activate this new coin in all wallets
        for (let wallet of activateInWallets) {
            // Make sure user has the ETH sidechain enabled
            if (!wallet.hasSubWallet(StandardCoinName.ETHSC)) {
                console.warn("Wallet doesn't have ESC. No activating the new ERC token");
                continue;
            }

            await wallet.createSubWallet(erc20Coin);
        }

        this.events.publish("custom-coin-added", erc20Coin.getID());

        return true;
    }

    public async deleteERC20Coin(erc20Coin: ERC20Coin) {
        this.availableCoins = this.availableCoins.filter((coin) => coin.getID() !== erc20Coin.getID());
        let allCustomERC20Coins = await this.getCustomERC20Coins();
        allCustomERC20Coins = allCustomERC20Coins.filter((coin) => coin.getContractAddress().toLowerCase() !== erc20Coin.getContractAddress().toLowerCase());
        await this.storage.set("custom-erc20-coins", allCustomERC20Coins);
        Logger.log('wallet', 'availableCoins after deleting', this.availableCoins);

        this.deletedERC20Coins.push(erc20Coin);
        await this.storage.set("custom-erc20-coins-deleted", this.deletedERC20Coins);

        this.events.publish("custom-coin-deleted");
    }

    public async getCustomERC20Coins(): Promise<ERC20Coin[]> {
        const rawCoinList = await this.storage.get("custom-erc20-coins");
        if (!rawCoinList) {
            return [];
        }

        const customCoins: ERC20Coin[] = [];
        for (let rawCoin of rawCoinList) {
            customCoins.push(ERC20Coin.fromJson(rawCoin));
        }

        return customCoins;
    }

    private async initDeletedCustomERC20Coins(): Promise<ERC20Coin[]> {
        const rawCoinList = await this.storage.get("custom-erc20-coins-deleted");
        if (!rawCoinList) {
            return [];
        }

        for (let rawCoin of rawCoinList) {
            this.deletedERC20Coins.push(ERC20Coin.fromJson(rawCoin));
        }
    }

    /**
     * Appens all custom ERC20 coins to the list of available coins.
     */
    private async addCustomERC20CoinsToAvailableCoins() {
        const existingCoins = await this.getCustomERC20Coins();

        for (let coin of existingCoins) {
            this.availableCoins.push(coin);
        }
    }
}
