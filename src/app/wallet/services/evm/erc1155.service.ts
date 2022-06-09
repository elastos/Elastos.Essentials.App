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
import { BehaviorSubject, Observable } from 'rxjs';
import { lazyWeb3Import } from 'src/app/helpers/import.helper';
import { Logger } from 'src/app/logger';
import type Web3 from 'web3';
import type { AnyNetworkWallet } from '../../model/networks/base/networkwallets/networkwallet';
import { EVMNetwork } from '../../model/networks/evms/evm.network';
import type { ERC1155Provider } from '../../model/networks/evms/nfts/erc1155.provider';
import { NFTAsset } from '../../model/networks/evms/nfts/nftasset';
import type { NFTResolvedInfo } from '../../model/networks/evms/nfts/resolvedinfo';
import type { EVMSafe } from '../../model/networks/evms/safes/evm.safe';
import { WalletNetworkService } from '../network.service';
import { WalletPrefsService } from '../pref.service';
import type { FetchAssetsEvent } from './erc721.service';
import { EVMService } from './evm.service';

type ERC1155Transfer = {
    address: string; // NFT contract address - "0x020c7303664bc88ae92cE3D380BF361E03B78B81"
    blockHash: string; // "0xf11791e3662ac314eee6f57eafcb3448754aa7198f2a93a505ddc5679b933894"
    blockNumber: number; // 9635607
    event: "TransferSingle";
    // raw: {data: '0x57919fe4ec94a175881ded015092d6cc6ec106e84ac15d0e…0000000000000000000000000000000000000000000000001', topics: Array(4)}
    returnValues: { // Matches the TransferSIngle event signature
        [0]: string; // operator - "0x02E8AD0687D583e2F6A7e5b82144025f30e26aA0"
        [1]: string; // sender - "0x02E8AD0687D583e2F6A7e5b82144025f30e26aA0"
        [2]: string; // receiver - "0xbA1ddcB94B3F8FE5d1C0b2623cF221e099f485d1"
        [3]: string; // token ID - "39608514200588865283440841425600775513887709291921581824093434814539493127892"
        [4]: string; // number of NFTs transfered "1"
    }
}

@Injectable({
    providedIn: 'root'
})
export class ERC1155Service {
    public static instance: ERC1155Service = null;

    /** Web3 variables to call smart contracts */
    private web3: Web3;
    private erc1155ABI: any;

    constructor(
        private prefs: WalletPrefsService,
        private http: HttpClient,
        private evmService: EVMService,
        private networkService: WalletNetworkService
    ) {
        ERC1155Service.instance = this;

        this.networkService.activeNetwork.subscribe(activeNetwork => {
            if (activeNetwork) {
                this.web3 = null;
            }
        });
    }

    // Lazy web3 init for angular bundle optimization
    private async getWeb3(): Promise<Web3> {
        if (this.web3)
            return this.web3;

        const EssentialsWeb3Provider = (await import('src/app/model/essentialsweb3provider')).EssentialsWeb3Provider;
        const trinityWeb3Provider = new EssentialsWeb3Provider(this.networkService.activeNetwork.value.getRPCUrl(), this.networkService.activeNetwork.value.key);

        const Web3 = await lazyWeb3Import();
        this.web3 = new Web3(trinityWeb3Provider);

        // Standard ERC20 contract ABI
        this.erc1155ABI = require('../../../../assets/wallet/ethereum/Erc1155ABI.json');
        return this.web3;
    }

    /**
     * Get basic coin info at creation time.
     */
    public async getCoinInfo(address: string): Promise<NFTResolvedInfo> {
        try {
            const erc1155Contract = new (await this.getWeb3()).eth.Contract(this.erc1155ABI, address);
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
    public fetchAllAssets(accountAddress: string, contractAddress: string): Observable<FetchAssetsEvent> {
        let subject = new BehaviorSubject<FetchAssetsEvent>({ assets: [] });
        let observable = subject.asObservable();

        void (async () => {
            let assets: NFTAsset[] = [];
            let assetsCouldBeRetrieved = false;

            // User's wallet address on 32 bytes
            let paddedAccountAddress = '0x' + accountAddress.substr(2).padStart(64, "0"); // 64 = 32 bytes * 2 chars per byte // 20 bytes to 32 bytes

            try {
                // Get transfer logs from the EVM node
                // More info at: https://docs.alchemy.com/alchemy/guides/eth_getlogs#what-are-event-signatures
                const erc1155Contract = new (await this.getWeb3()).eth.Contract(this.erc1155ABI, contractAddress, { from: accountAddress });
                let transferSingleEventTopic = this.web3.utils.sha3("TransferSingle(address,address,address,uint256,uint256)");
                let transferInEvents = await erc1155Contract.getPastEvents('TransferSingle', {
                    // All blocks
                    fromBlock: 0, toBlock: 'latest',
                    // transfer event signature + 3rd parameter should be the account address. (meaning "received the NFT")
                    topics: [
                        transferSingleEventTopic,
                        null,
                        null,
                        paddedAccountAddress // Received by us
                    ]
                }) as any as ERC1155Transfer[];

                // Also get transfer out events, so we can know which tokens are still in our possession
                let transferOutEvents = await erc1155Contract.getPastEvents('TransferSingle', {
                    // All blocks
                    fromBlock: 0, toBlock: 'latest',
                    // transfer event signature + 2nd parameter should be the account address. (meaning "sent the NFT")
                    topics: [
                        transferSingleEventTopic,
                        null,
                        paddedAccountAddress // Sent by us
                    ]
                }) as any as ERC1155Transfer[];

                // Based on all transfers (in/out), rebuild the history of NFT ownerships until we can get
                // The list of tokens that we still own
                let allTransferEvents = [...transferInEvents, ...transferOutEvents];

                // Sort by date ASC
                allTransferEvents = allTransferEvents.sort((a, b) => a.blockNumber - b.blockNumber);

                // Retrace history from old blocks to recent blocks
                let ownedTokenIds: { [tokenId: string]: boolean } = {};
                allTransferEvents.forEach(transferEvent => {
                    // User account as sender? Remove the token from the list
                    if (transferEvent.returnValues[1].toLowerCase() === accountAddress.toLowerCase())
                        delete ownedTokenIds[transferEvent.returnValues[3]];

                    // User account as received? Add the token to the list
                    if (transferEvent.returnValues[2].toLowerCase() === accountAddress.toLowerCase())
                        ownedTokenIds[transferEvent.returnValues[3]] = true;
                });

                // Check if we have a NFT provider available to provide more info about this
                let activeNetwork = this.networkService.activeNetwork.value;
                let erc1155Provider: ERC1155Provider;
                if (activeNetwork instanceof EVMNetwork)
                    erc1155Provider = activeNetwork.getERC1155Provider(contractAddress);

                // Iterate over transferEvents() to get more info.
                try {
                    let checkCount = 0;
                    for (let tokenId of Object.keys(ownedTokenIds)) {
                        let asset = new NFTAsset();
                        asset.id = tokenId;
                        asset.displayableId = asset.id;

                        // If we have a provider for this contract, use it to extract more info
                        let p: Promise<void>;
                        if (erc1155Provider)
                            p = erc1155Provider.fetchNFTAssetInformation(erc1155Contract, asset, accountAddress)
                        else
                            p = Promise.resolve();

                        void p.then(() => {
                            checkCount++;

                            assets.push(asset);
                            subject.next({ assets });

                            if (checkCount === Object.keys(ownedTokenIds).length)
                                subject.complete();
                        });
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
            if (!assetsCouldBeRetrieved) {
                subject.complete();
                return observable;
            }
        })();

        return observable;
    }

    /**
    * Creates a raw EVM transaction to transfer a ERC1155 NFT.
    */
    public async createRawTransferERC1155Transaction(networkWallet: AnyNetworkWallet, senderAddress: string, nftAddress: string, nftAssetId: string, destinationAddress: string): Promise<any> {
        Logger.log("wallet", "Creating ERC1155 transfer transaction", networkWallet.network.name, senderAddress, nftAddress, nftAssetId, destinationAddress);

        let web3 = await this.evmService.getWeb3(networkWallet.network);

        const erc1155Contract = new web3.eth.Contract(this.erc1155ABI, nftAddress, {
            from: senderAddress
        });
        const transferMethod = erc1155Contract.methods.safeTransferFrom(senderAddress, destinationAddress, nftAssetId, 1);

        var gasLimit = 3000000; // Default value
        try {
            // Estimate gas cost
            let gasTemp = await transferMethod.estimateGas();
            // '* 1.5': Make sure the gaslimit is big enough - add a bit of margin for fluctuating gas price
            gasLimit = Math.ceil(gasTemp * 1.5);
        } catch (error) {
            Logger.error("wallet", 'createRawTransferERC1155Transaction(): estimateGas error:', error);
        }

        let gasPrice = await this.evmService.getGasPrice(networkWallet.network);

        let rawTransaction = await (networkWallet.safe as unknown as EVMSafe).createContractTransaction(
            nftAddress,
            gasPrice,
            web3.utils.toHex(gasLimit),
            await this.evmService.getNonce(networkWallet.network, senderAddress),
            transferMethod.encodeABI());

        Logger.log("wallet", "createRawTransferERC1155Transaction() - raw transaction", rawTransaction);

        return rawTransaction;
    }
}
