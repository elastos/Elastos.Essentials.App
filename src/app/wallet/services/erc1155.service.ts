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

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { EssentialsWeb3Provider } from 'src/app/model/essentialsweb3provider';
import Web3 from 'web3';
import { NFTAsset } from '../model/nfts/nftasset';
import { NFTResolvedInfo } from '../model/nfts/resolvedinfo';
import { WalletNetworkService } from './network.service';
import { WalletPrefsService } from './pref.service';

type ERC1155Transfer = {
    address: string; // NFT contract address - "0x020c7303664bc88ae92cE3D380BF361E03B78B81"
    blockHash: string; // "0xf11791e3662ac314eee6f57eafcb3448754aa7198f2a93a505ddc5679b933894"
    blockNumber: number; // 9635607
    event: "TransferSingle";
    // raw: {data: '0x57919fe4ec94a175881ded015092d6cc6ec106e84ac15d0e…0000000000000000000000000000000000000000000000001', topics: Array(4)}
    returnValues: { // Matches the TransferSIngle event signature
        _operator: string; // "0x02E8AD0687D583e2F6A7e5b82144025f30e26aA0"
        _from: string; // sender - "0x02E8AD0687D583e2F6A7e5b82144025f30e26aA0"
        _to: string; // receiver - "0xbA1ddcB94B3F8FE5d1C0b2623cF221e099f485d1"
        _id: string; // token ID - "39608514200588865283440841425600775513887709291921581824093434814539493127892"
        _value: string; // number of NFTs transfered "1"
    }
}

@Injectable({
    providedIn: 'root'
})
export class ERC1155Service {
    /** Web3 variables to call smart contracts */
    private web3: Web3;
    private erc1155ABI: any;

    constructor(private prefs: WalletPrefsService, private http: HttpClient, private networkService: WalletNetworkService) {
        this.networkService.activeNetwork.subscribe(activeNetwork => {
            if (activeNetwork) {
                this.web3 = null;
            }
        });
    }

    // Lazy web3 init for angular bundle optimization
    private getWeb3(): Web3 {
        if (this.web3)
            return this.web3;

        const trinityWeb3Provider = new EssentialsWeb3Provider(this.networkService.activeNetwork.value.getMainEvmRpcApiUrl());
        this.web3 = new Web3(trinityWeb3Provider);

        // Standard ERC20 contract ABI
        this.erc1155ABI = require('../../../assets/wallet/ethereum/Erc1155ABI.json');
        return this.web3;
    }

    /**
     * Get basic coin info at creation time.
     */
    public async getCoinInfo(address: string): Promise<NFTResolvedInfo> {
        try {
            const erc1155Contract = new (this.getWeb3()).eth.Contract(this.erc1155ABI, address);
            Logger.log('wallet', 'erc1155Contract', erc1155Contract);

            const nftName = await erc1155Contract.methods.name().call();
            Logger.log('wallet', 'NFT name:', nftName);

            return {
                name: nftName
            };
        } catch (err) {
            Logger.log('wallet', 'getCoinInfo', err);
            return null;
        }
    }

    /**
     * Finds all assets owned by a given user for a given NFT contract.
     *
     * Returns null if owner assets can't be retrieved (i.e. not a enumerable contract, non standard contract, etc)
     */
    public async fetchAllAssets(accountAddress: string, contractAddress: string): Promise<NFTAsset[]> {
        let assets: NFTAsset[] = [];
        let assetsCouldBeRetrieved = false;

        // User's wallet address on 32 bytes
        let paddedAccountAddress = '0x' + accountAddress.substr(2).padStart(64, "0"); // 64 = 32 bytes * 2 chars per byte // 20 bytes to 32 bytes

        try {
            // Get transfer logs from the EVM node
            // More info at: https://docs.alchemy.com/alchemy/guides/eth_getlogs#what-are-event-signatures
            const erc1155Contract = new (this.getWeb3()).eth.Contract(this.erc1155ABI, contractAddress, { from: accountAddress });
            let transferSingleEventTopic = this.web3.utils.sha3("TransferSingle(address,address,address,uint256,uint256)");
            let transferEvents = await erc1155Contract.getPastEvents('TransferSingle', {
                // All blocks
                fromBlock: 0,
                toBlock: 'latest',
                // transfer event signature + 3rd parameter should be the account address. (meaning "received the NFT")
                topics: [
                    transferSingleEventTopic,
                    null,
                    null,
                    paddedAccountAddress
                ]
            }) as any as ERC1155Transfer[];

            // Check if we have a NFT provider available to provide more info about this
            let erc1155Provider = this.networkService.activeNetwork.value.getERC1155Provider(contractAddress);

            // Iterate over transferEvents() to get more info.
            try {
                for (let i = 0; i < transferEvents.length; i++) {
                    let transferEvent = transferEvents[i];
                    let tokenId = transferEvent.returnValues._id;

                    let asset = new NFTAsset();
                    asset.id = tokenId;

                    // If we have a provider for this contract, use it to extract more info
                    if (erc1155Provider) {
                        await erc1155Provider.fetchNFTAssetInformation(erc1155Contract, asset, accountAddress);
                    }

                    assets.push(asset);
                }

                assetsCouldBeRetrieved = true;
            }
            catch (e) {
                // Silent catch
                console.warn(e); // TMP
            }
        }
        catch (e) {
            Logger.warn("wallet", "Failed to get ERC1155 events", e);
        }

        // If assets list couldn't be fetched, return null so that the caller knows this
        // doesn't mean we have "0" asset.
        if (!assetsCouldBeRetrieved)
            return null;

        return assets;
    }
}
