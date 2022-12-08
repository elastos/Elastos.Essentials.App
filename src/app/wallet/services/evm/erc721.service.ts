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
import { Contract } from 'web3-eth-contract';
import type { AnyNetworkWallet } from '../../model/networks/base/networkwallets/networkwallet';
import { EVMNetwork } from '../../model/networks/evms/evm.network';
import { NFTAsset } from '../../model/networks/evms/nfts/nftasset';
import type { NFTResolvedInfo } from '../../model/networks/evms/nfts/resolvedinfo';
import type { EVMSafe } from '../../model/networks/evms/safes/evm.safe';
import { WalletNetworkService } from '../network.service';
import { EVMService } from './evm.service';

export type FetchAssetsEvent = {
    //fetchComplete: boolean; // Whether this is the last event of a fetch operation or not.
    assets: NFTAsset[]; // On going list of assets. Populated as more and more NFTs are discovered.
}

type ERC721Transfer = {
    address: string; // NFT contract address - "0x020c7303664bc88ae92cE3D380BF361E03B78B81"
    blockHash: string; // "0xf11791e3662ac314eee6f57eafcb3448754aa7198f2a93a505ddc5679b933894"
    blockNumber: number; // 9635607
    event: "Transfer";
    // raw: {data: '0x57919fe4ec94a175881ded015092d6cc6ec106e84ac15d0e…0000000000000000000000000000000000000000000000001', topics: Array(4)}
    returnValues: { // Matches the Transfer event signature
        [0]: string; // sender - "0x02E8AD0687D583e2F6A7e5b82144025f30e26aA0"
        [1]: string; // receiver - "0xbA1ddcB94B3F8FE5d1C0b2623cF221e099f485d1"
        [2]: string; // token ID - "39608514200588865283440841425600775513887709291921581824093434814539493127892"
    }
}

/**
 * List of popular IPFS gateways that we want to replace with our preferred gateway instead.
 */
const IPFSGatewayPrefixesToReplace = [
    "https://gateway.pinata.cloud/ipfs",
    "https://ipfs.io/ipfs"
]

@Injectable({
    providedIn: 'root'
})
export class ERC721Service {
    public static instance: ERC721Service = null;

    /** Web3 variables to call smart contracts */
    private web3: Web3;
    private erc721ABI: any;

    constructor(
        private http: HttpClient,
        private evmService: EVMService,
        private networkService: WalletNetworkService
    ) {
        ERC721Service.instance = this;

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
        this.erc721ABI = require('../../../../assets/wallet/ethereum/Erc721EnumerableABI.json');
        return this.web3;
    }

    public async getCoinInfo(address: string): Promise<NFTResolvedInfo> {
        try {
            const erc721Contract = new (await this.getWeb3()).eth.Contract(this.erc721ABI, address);
            Logger.log('wallet', 'erc721Contract', erc721Contract);

            const nftName = await erc721Contract.methods.name().call();
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
     * Refreshes all assets owned by a given user for a given NFT contract.
     * - If assetIDs list is not given (we don't know the list of NFT asset ids from the TX providers), then we first try to fetch
     *   info about the NFTs.
     * - Then based on the list of all asset IDs, we refresh their content and convert that into NFTAsset items that contain enhanced information.
     */
    public refreshAllAssets(network: EVMNetwork, accountAddress: string, contractAddress: string, assetIDs: string[] = null): Observable<FetchAssetsEvent> {
        let subject = new BehaviorSubject<FetchAssetsEvent>({ assets: [] });
        let observable = subject.asObservable();

        Logger.log("wallet", "Starting to fetch ERC721 NFTs for contract " + contractAddress);

        void (async () => {
            const erc721Contract = new (await this.getWeb3()).eth.Contract(this.erc721ABI, contractAddress, { from: accountAddress });

            let assetsCouldBeRetrieved = false;
            if (assetIDs && assetIDs.length > 0) { // If the array is empty, this also means "not provided"
                // The assets list was given to us already
                assetsCouldBeRetrieved = true;
            }
            else {
                // Make sure this is a enumerable NFT - If not, we can't get the assets.
                // Problem: some contracts don't even implement supportsInterface().
                /* const nftokenEnumerableInterface = await erc721Contract.methods.supportsInterface('0x780e9d63').call();
                if (!nftokenEnumerableInterface) {
                    Logger.warn("wallet", "ERC721 contract is not enumerable");
                    return [];
                } */

                // Retrieve how many assets are owned by this account
                const assetsNumber = await erc721Contract.methods.balanceOf(accountAddress).call();
                Logger.log("wallet", "ERC721 assets number:", assetsNumber);

                // Iterate over tokenOfOwnerByIndex() to get more info. If an exception occurs this probably
                // means that tokenOfOwnerByIndex() is not implemented (not an enumerable ERC721).
                try {
                    let tokenIDs = [];
                    // Some contracts implement getOwnerTokens() (crypto kitties) which directly returns the
                    // tokens ids without a loop. This is legacy from when ERC721Enumerable was not defined.
                    try {
                        tokenIDs = await erc721Contract.methods.getOwnerTokens(accountAddress).call();
                        assetsCouldBeRetrieved = true;
                    }
                    catch (e) {
                        // Still no such method? Try the transfer event discovery way
                        tokenIDs = await this.fetchTokenIDsFromTransferEvents(accountAddress, contractAddress);
                        if (tokenIDs)
                            assetsCouldBeRetrieved = true;
                        else {
                            // Try the standard enumeration (ERC721Enumerable)
                            tokenIDs = [];
                            for (let i = 0; i < assetsNumber; i++) {
                                const tokenID = await erc721Contract.methods.tokenOfOwnerByIndex(accountAddress, i).call();
                                assetsCouldBeRetrieved = true;

                                if (tokenID != null && tokenID != undefined)
                                    tokenIDs.push(tokenID);
                            }
                        }
                    }
                    Logger.log("wallet", "Fetched ERC721 token IDs:", tokenIDs);

                    assetIDs = tokenIDs;
                }
                catch (e) {
                    // Silent catch
                    console.warn(e); // TMP
                }

                // If assets list couldn't be fetched, return null so that the caller knows this
                // doesn't mean we have "0" asset.
                if (!assetsCouldBeRetrieved) {
                    subject.complete();
                    return;
                }
            }

            // Now that we have the assets IDs list, refresh them
            let assets: NFTAsset[] = [];
            for (let i = 0; i < assetIDs.length; i++) {
                let tokenID = assetIDs[i];
                void this.fetchTokenID(network, erc721Contract, contractAddress, accountAddress, tokenID).then(asset => {
                    assets.push(asset);
                    subject.next({ assets });

                    if (assets.length === assetIDs.length)
                        subject.complete();
                });
            }
        })();

        return observable;
    }

    private async fetchTokenID(network: EVMNetwork, erc721Contract: Contract, contractAddress: string, accountAddress: string, tokenID: string): Promise<NFTAsset> {
        let asset = new NFTAsset();
        asset.id = tokenID;
        asset.displayableId = asset.id;

        // Now try to get more information about this asset - ERC721Metadata / tokenURI()
        let tokenURI: string = null;
        try {
            tokenURI = await erc721Contract.methods.tokenURI(tokenID).call();
        }
        catch (e) {
            // Inexisting method, contract not adhering to the metadata interface?
            // Try the legacy tokenMetadata() implemented by some contracts
            try {
                tokenURI = await erc721Contract.methods.tokenMetadata(tokenID).call();
            }
            catch (e) {
                // Still nothing? That's ok, we'll display placeholder values.
                // Silent catch
            }
        }

        if (tokenURI) {
            await this.extractAssetMetadata(network, asset, erc721Contract, contractAddress, accountAddress, tokenURI);
        }

        return asset;
    }

    /**
     * Method to discover ERC721 tokens owned by a user based on Transfer logs.
     */
    public async fetchTokenIDsFromTransferEvents(accountAddress: string, contractAddress: string): Promise<string[]> {
        // User's wallet address on 32 bytes
        let paddedAccountAddress = '0x' + accountAddress.substr(2).padStart(64, "0"); // 64 = 32 bytes * 2 chars per byte // 20 bytes to 32 bytes

        try {
            // Get transfer logs from the EVM node
            // More info at: https://docs.alchemy.com/alchemy/guides/eth_getlogs#what-are-event-signatures
            const erc721Contract = new (await this.getWeb3()).eth.Contract(this.erc721ABI, contractAddress, { from: accountAddress });
            let transferEventTopic = this.web3.utils.sha3("Transfer(address,address,uint256)");
            let transferInEvents = await erc721Contract.getPastEvents('Transfer', {
                // All blocks
                fromBlock: 0, toBlock: 'latest',
                // transfer event signature + 2nd parameter should be the account address. (meaning "received the NFT")
                topics: [
                    transferEventTopic,
                    null,
                    paddedAccountAddress // Received by us
                ]
            }) as any as ERC721Transfer[];

            // Also get transfer out events, so we can know which tokens are still in our possession
            let transferOutEvents = await erc721Contract.getPastEvents('Transfer', {
                // All blocks
                fromBlock: 0, toBlock: 'latest',
                // transfer event signature + 1st parameter should be the account address. (meaning "sent the NFT")
                topics: [
                    transferEventTopic,
                    paddedAccountAddress // Sent by us
                ]
            }) as any as ERC721Transfer[];

            // Based on all transfers (in/out), rebuild the history of NFT ownerships until we can get
            // The list of tokens that we still own
            let allTransferEvents = [...transferInEvents, ...transferOutEvents];

            // Sort by date ASC
            allTransferEvents = allTransferEvents.sort((a, b) => a.blockNumber - b.blockNumber);

            // Retrace history from old blocks to recent blocks
            let ownedTokenIds: { [tokenId: string]: boolean } = {};
            allTransferEvents.forEach(transferEvent => {
                // User account as sender? Remove the token from the list
                if (transferEvent.returnValues[0].toLowerCase() === accountAddress.toLowerCase())
                    delete ownedTokenIds[transferEvent.returnValues[2]];

                // User account as received? Add the token to the list
                if (transferEvent.returnValues[1].toLowerCase() === accountAddress.toLowerCase())
                    ownedTokenIds[transferEvent.returnValues[2]] = true;
            });

            return Object.keys(ownedTokenIds);
        }
        catch (e) {
            Logger.warn("wallet", "Failed to get ERC721 events", e);
            return null;
        }
    }

    /**
     * Tries different ways to automatically extract metadata from a remote token uri, and then save
     * the information in the asset.
     *
     * Expected format (https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md):
        {
            "title": "Asset Metadata",
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Identifies the asset to which this NFT represents"
                },
                "description": {
                    "type": "string",
                    "description": "Describes the asset to which this NFT represents"
                },
                "image": {
                    "type": "string",
                    "description": "A URI pointing to a resource with mime type image/* representing the asset to which this NFT represents. Consider making any images at a width between 320 and 1080 pixels and aspect ratio between 1.91:1 and 4:5 inclusive."
                }
            }
        }

        ELIENS OF HEDROM:
            attributes: Array(7) // OPENSEA STYLE
                0: {trait_type: 'Background', value: 'Red'}
                1: {trait_type: 'Body', value: 'Light_Blue'}
                2: {trait_type: 'Mouth', value: 'Smile'}
                3: {trait_type: 'Markings', value: 'Blue'}
                4: {trait_type: 'Eyes', value: 'Purple'}
                5: {trait_type: 'Light', value: 'Yellow'}
                6: {trait_type: 'Accessory', value: 'Choker'}

        BUNNY PUNK:
            attributes: Array(15)
                0: {trait_type: 'Background', value: 'Olive Background'}
                1: {trait_type: 'Bunny', value: 'White  Bunny'}
            external_url: "https://bunnypunk.io/"
                collection:
                family: "Bunny Punk NFT"
                name: "Bunny Punk"
            properties: // ENJIN STYLE
                category: "image"
                creators: Array(1)
                    0:
                        address: "0x9A754044FbfA95d15b252453c1BB5401320A8386"
                        share: 100
                files: Array(1)
                    0:
                        type: "image"
                        uri: ""

        Special attribute types: (dates, etc):
        {
            "display_type": "date",
            "trait_type": "birthday",
            "value": 1546360800
        }
    */
    private async extractAssetMetadata(network: EVMNetwork, asset: NFTAsset, contract: Contract, contractAddress: string, accountAddress: string, tokenURI: string): Promise<void> {
        Logger.log("wallet", "Trying to extract NFT metadata for token uri", tokenURI);

        let erc721Provider = network.getERC721Provider(contractAddress);

        if (erc721Provider) {
            // There is a custom provider available, let it extract the relevant data
            return erc721Provider.fetchNFTAssetInformation(contract, asset, tokenURI, accountAddress);
        }
        else {
            // No specific provider found, use generic ERC721 metadata extraction

            // Unsupported url format
            if (!tokenURI || (!tokenURI.startsWith("http") && !tokenURI.startsWith("ipfs"))) {
                return;
            }

            // If the url is a IPFS url, replace it with a gateway
            tokenURI = this.replaceIPFSUrl(tokenURI);

            try {
                let metadata: any = await this.http.get(tokenURI).toPromise();
                Logger.log("wallet", "Got NFT metadata", metadata, "from", tokenURI);

                if (metadata.data) {
                    metadata = metadata.data;
                }

                // Name
                if ("properties" in metadata && "name" in metadata.properties)
                    asset.name = metadata.properties.name.description || null;
                else
                    asset.name = metadata.name || null;

                // Description
                if ("properties" in metadata && "description" in metadata.properties)
                    asset.description = metadata.properties.description.description || null;
                else
                    asset.description = metadata.description || null;

                // Picture
                if ("properties" in metadata && "image" in metadata.properties)
                    asset.imageURL = this.replaceIPFSUrl(metadata.properties.image.description || null);
                else
                    asset.imageURL = this.replaceIPFSUrl(metadata.image || null);

                // OpenSea information
                asset.attributes = metadata.attributes || [];
                if ("externa_url" in metadata)
                    asset.externalURL = metadata.externa_url;

                // Unset the image if not a valid url
                if (asset.imageURL && !asset.imageURL.startsWith("http"))
                    asset.imageURL = null;
            }
            catch (e) {
                // Silent catch
                return;
            }
        }
    }

    /**
     * If the url starts with ipfs, returns the gateway-accessible url.
     * Otherwise, returns the given url.
     */
    private replaceIPFSUrl(anyUrl: string): string {
        if (!anyUrl)
            return anyUrl;

        if (anyUrl.startsWith("ipfs")) {
            // Some token URI (rarible) use this format: ipfs://ipfs/abcde.
            // So we remove the duplicate ipfs/ as we are adding our own just after.
            anyUrl = anyUrl.replace("ipfs://ipfs/", "ipfs://");

            return `https://ipfs.trinity-tech.io/ipfs/${anyUrl.replace("ipfs://", "")}`;
        }

        // Replace IPFS gateways potentially harcoded by NFTs, with the ipfs.io gateway, to reduce
        // rate limiting api call errors (like on pinata).
        // NOTE: not working well, maybe IPFS hashes can't be fetched (eg getting a vitrim or bunny hash through ttech.io gateway often times out)
        for (let gateway of IPFSGatewayPrefixesToReplace) {
            if (anyUrl.startsWith(gateway)) {
                anyUrl = anyUrl.replace(gateway, "https://ipfs.trinity-tech.io/ipfs");
                break; // Don't search further
            }
        }

        return anyUrl;
    }

    /*public async getERC20Coin(address: string, ethAccountAddress: string) {
        const coinInfo = await this.getCoinInfo(address, ethAccountAddress);
        const newCoin = new ERC20Coin(coinInfo.coinSymbol, coinInfo.coinName, address, this.prefs.activeNetwork, false);
        return newCoin;
    } */

    public async estimateTransferERC721TransactionGas(networkWallet: AnyNetworkWallet, senderAddress: string, nftAddress: string, nftAssetId: string) {
        let web3 = await this.evmService.getWeb3(networkWallet.network);

        const erc721Contract = new web3.eth.Contract(this.erc721ABI, nftAddress, {
            from: senderAddress
        });
        /**
         * IMPORTANT NOTES:
         * We use a fake destination address just to estimate the transfer cost.
         */
        const transferMethod = erc721Contract.methods.safeTransferFrom(senderAddress, senderAddress, nftAssetId);

        var gasLimit = 3000000; // Default value
        try {
            // Estimate gas cost
            let gasTemp = await transferMethod.estimateGas();
            // '* 1.5': Make sure the gaslimit is big enough - add a bit of margin for fluctuating gas price
            gasLimit = Math.ceil(gasTemp * 1.5);
        } catch (error) {
            Logger.error("wallet", 'estimateTransferERC721TransactionGas(): estimateGas error:', error);
            if (new String(error).includes("gas required exceeds allowance")) {
                // This highly probably means that the transfer method will fail because it's locked somehow (by non standard implementations).
                Logger.warn("wallet", "estimateTransferERC721TransactionGas(): transfer method can't be called. Unable to create transfer transaction.");
                return null;
            }
        }
        return gasLimit;
    }

    /**
    * Creates a raw EVM transaction to transfer a ERC721 NFT.
    */
    public async createRawTransferERC721Transaction(networkWallet: AnyNetworkWallet, senderAddress: string, nftAddress: string, nftAssetId: string, destinationAddress: string, gasPriceArg: string = null, gasLimitArg: string = null): Promise<any> {
        Logger.log("wallet", "Creating ERC721 transfer transaction", networkWallet.network.name, senderAddress, nftAddress, nftAssetId, destinationAddress);

        let web3 = await this.evmService.getWeb3(networkWallet.network);

        const erc721Contract = new web3.eth.Contract(this.erc721ABI, nftAddress, {
            from: senderAddress
        });
        const transferMethod = erc721Contract.methods.safeTransferFrom(senderAddress, destinationAddress, nftAssetId);

        let gasLimit = gasLimitArg;
        if (gasLimit == null)
            gasLimit = (await this.estimateTransferERC721TransactionGas(networkWallet, senderAddress, nftAddress, nftAssetId)).toString();
        if (gasLimit == null)
            return null;

        let gasPrice = gasPriceArg;
        if (gasPrice == null)
            gasPrice = await this.evmService.getGasPrice(networkWallet.network);

        let rawTransaction = await (networkWallet.safe as unknown as EVMSafe).createContractTransaction(
            nftAddress,
            '0',
            gasPrice,
            web3.utils.toHex(gasLimit),
            await this.evmService.getNonce(networkWallet.network, senderAddress),
            transferMethod.encodeABI());

        Logger.log("wallet", "createRawTransferERC721Transaction() - raw transaction", rawTransaction);

        return rawTransaction;
    }
}
