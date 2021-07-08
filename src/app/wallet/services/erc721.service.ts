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
import Web3 from 'web3';
import { ERC20Coin } from '../model/Coin';
import { EssentialsWeb3Provider } from 'src/app/model/essentialsweb3provider';
import { Logger } from 'src/app/logger';
import { WalletPrefsService } from './pref.service';
import { NFTAsset } from '../model/nftasset';
import { HttpClient } from '@angular/common/http';
import { ElastosApiUrlType } from 'src/app/services/global.elastosapi.service';

export type ERC721ResolvedInfo = {
    /** Main NFT name, if set, or "" */
    name: string;
}

@Injectable({
    providedIn: 'root'
})
export class ERC721Service {
    /** Web3 variables to call smart contracts */
    private web3: Web3;
    private erc721ABI: any;

    constructor(private prefs: WalletPrefsService, private http: HttpClient) {
    }

    // Lazy web3 init for angular bundle optimization
    private getWeb3(): Web3 {
        if (this.web3)
            return this.web3;

        const trinityWeb3Provider = new EssentialsWeb3Provider(ElastosApiUrlType.ETHSC_RPC);
        this.web3 = new Web3(trinityWeb3Provider);

        // Standard ERC20 contract ABI
        this.erc721ABI = require('../../../assets/wallet/ethereum/Erc721EnumerableABI.json');
        return this.web3;
    }

    public isAddress(address: string) {
        return this.getWeb3().utils.isAddress(address);
    }

    public async isContractAddress(address: string) {
        const contractCode = await this.getWeb3().eth.getCode(address);
        return contractCode === '0x' ? false : true;
    }

    public async getCoinDecimals(address: string, ethAccountAddress: string) {
        let coinDecimals = 0;
        const erc20Contract = new (this.getWeb3()).eth.Contract(this.erc721ABI, address, { from: ethAccountAddress });
        if (erc20Contract) {
            coinDecimals = await erc20Contract.methods.decimals().call();
            Logger.log('wallet', 'Coin decimals:', coinDecimals);
        }
        return coinDecimals;
    }

    public async getCoinInfo(address: string): Promise<ERC721ResolvedInfo> {
        try {
            const erc721Contract = new (this.getWeb3()).eth.Contract(this.erc721ABI, address);
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
     * Finds all assets owned by a given user for a given NFT contract.
     *
     * Returns null if owner assets can't be retrieved (i.e. not a enumerable contract, non standard contract, etc)
     */
    public async fetchAllAssets(accountAddress: string, contractAddress: string): Promise<NFTAsset[]> {
        let assetsCouldBeRetrieved = false;
        const erc721Contract = new (this.getWeb3()).eth.Contract(this.erc721ABI, contractAddress, { from: accountAddress });

        // Make sure this is a enumerable NFT - If not, we can't get the assets.
        // Problem: some contracts don't even implement supportsInterface().
        /* const nftokenEnumerableInterface = await erc721Contract.methods.supportsInterface('0x780e9d63').call();
        if (!nftokenEnumerableInterface) {
            Logger.warn("wallet", "ERC721 contract is not enumerable");
            return [];
        } */

        // Retrieve how many assets are owned by this account
        const assetsNumber = await erc721Contract.methods.balanceOf(accountAddress).call();
        console.log("assetsNumber", assetsNumber);

        // Iterate over tokenOfOwnerByIndex() to get more info. If an exception occurs this probably
        // means that tokenOfOwnerByIndex() is not implemented (not an enumerable ERC721).
        let assets: NFTAsset[] = [];
        try {
            let tokenIDs = [];
            // Some contracts implement getOwnerTokens() (crypto kitties) which directly returns the
            // tokens ids without a loop. This is legacy from when ERC721Enumerable was not defined.
            try {
                tokenIDs = await erc721Contract.methods.getOwnerTokens(accountAddress).call();
                assetsCouldBeRetrieved = true;
            }
            catch (e) {
                // Method not implemented. Try the standard enumeration (ERC721Enumerable)
                for (let i=0; i<assetsNumber; i++) {
                    const tokenID = await erc721Contract.methods.tokenOfOwnerByIndex(accountAddress, i).call();
                    assetsCouldBeRetrieved = true;
                    tokenIDs.push(tokenID);
                }
            }
            console.log("tokenIDs", tokenIDs, assetsCouldBeRetrieved);

            for (let i=0; i<tokenIDs.length; i++) {
                let tokenID = tokenIDs[i];

                let asset = new NFTAsset();
                asset.id = tokenID;

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
                   await this.extractAssetMetadata(asset, tokenURI);
               }

               assets.push(asset);
            }
        }
        catch (e) {
            // Silent catch
            console.warn(e); // TMP
        }

        // If assets list couldn't be fetched, return null so that the caller knows this
        // doesn't mean we have "0" asset.
        if (!assetsCouldBeRetrieved)
            return null;

        return assets;
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
    */
    private async extractAssetMetadata(asset: NFTAsset, tokenURI: string): Promise<any> {
        console.log("DEBUG tokenURI", tokenURI)

        // Unsupported url format
        if (!tokenURI || !tokenURI.startsWith("http"))
            return;

        try {
            let metadata: any = await this.http.get(tokenURI).toPromise();
            Logger.log("wallet", "Got NFT metadata", metadata);

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
                asset.imageURL = metadata.properties.image.description || null;
            else
                asset.imageURL = metadata.image || null;

            // Unset the image if not a valid url
            if (asset.imageURL && !asset.imageURL.startsWith("http"))
                asset.imageURL = null;
        }
        catch (e) {
            // Silent catch
            return;
        }
    }

    /*public async getERC20Coin(address: string, ethAccountAddress: string) {
        const coinInfo = await this.getCoinInfo(address, ethAccountAddress);
        const newCoin = new ERC20Coin(coinInfo.coinSymbol, coinInfo.coinSymbol, coinInfo.coinName, address, this.prefs.activeNetwork, false);
        return newCoin;
    } */
}
