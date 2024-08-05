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
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import type Web3 from 'web3';
import { Config } from '../../config/Config';
import { AnyNetwork } from '../../model/networks/network';
import { WalletNetworkService } from '../network.service';
import { EVMService } from './evm.service';
import BigNumber from 'bignumber.js';
import { GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { BPoSNFTInfo } from '../../model/elastos.types';


@Injectable({
    providedIn: 'root'
})
export class BPoSERC721Service {
    public static instance: BPoSERC721Service = null;

    /** Web3 variables to call smart contracts */
    private web3: Web3;
    private bposClaimErc721ABI: any;
    // private bposErc721ABI: any;

    constructor(
        private evmService: EVMService,
        private networkService: WalletNetworkService
    ) {
        BPoSERC721Service.instance = this;

        this.networkService.activeNetwork.subscribe(activeNetwork => {
            if (activeNetwork) {
                this.web3 = null;
            }
        });
    }

    private async getWeb3(network: AnyNetwork = null): Promise<Web3> {
        if (this.web3)
            return this.web3;

        this.web3 = this.evmService.getWeb3(network ? network : this.networkService.activeNetwork.value, true);

        // BPoS ERC721 contract ABI
        // this.bposErc721ABI = require('../../../../assets/wallet/ethereum/BPoSErc721ABI.json');
        this.bposClaimErc721ABI = require('../../../../assets/wallet/ethereum/BPoSClaimErc721ABI.json');
        return this.web3;
    }

    /**
     * Check if the nft for mint transactions can be claimed.
     *      null : the mint transaction does not exist or has not been confirmed.
     *       0   : Has been claimed
     *    nft id : Can be claimed
     * @param elaHash
     * @param network
     * @returns
     */
    public async canClaim(elaHash: string, network: AnyNetwork = null): Promise<string> {
        try {
            const bposClaimErc721Contract = new (await this.getWeb3(network)).eth.Contract(this.bposClaimErc721ABI, Config.ETHSC_CLAIMNFT_CONTRACTADDRESS);
            let hash = '0x' + Util.reverseHexToBE(elaHash);
            return await bposClaimErc721Contract.methods.canClaim(hash).call();
        } catch (err) {
            // Logger.warn('wallet', 'BPoSERC721Service canClaim exception', err);
            // After the main chain mint BPoS NFT, it needs to wait for 6 blocks to confirm.
            return null;
        }
    }

    public async getBPoSNFTInfo(tokenId: string, network: AnyNetwork = null): Promise<BPoSNFTInfo> {
        try {
            let nftIDforApi = this.convertBPoSNFTId(tokenId);
            let info = await GlobalElastosAPIService.instance.getBPoSNFTInfo(nftIDforApi)
            return info;
        } catch (err) {
            Logger.warn('wallet', 'BPoSERC721Service getBPoSNFTInfo exception', err)
            return null;
        }
    }

    // the bposNFTId is a decimal string and needs to be converted to a hexadecimal string
    private convertBPoSNFTId(bposNFTId: string) {
        let nftID = new BigNumber(bposNFTId, 10);
        return nftID.toString(16);
    }
}
