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
import BigNumber from 'bignumber.js';

@Injectable({
    providedIn: 'root'
})
export class Config {
    public static DEBUG_LOGS_ENABLED = true;

    public static UTXO_CONSOLIDATE_PROMPT_THRESHOLD = 500; // Number of UTXOs after which the app will send notification to user.
    public static UTXO_CONSOLIDATE_MIN_THRESHOLD = 100; // We don't recommend consolidating utxos if the number of UTXOs less than 100.

    public static SELA = 100000000; // Number of SELA per ELA.
    public static SELAAsBigNumber = new BigNumber(Config.SELA);

    public static WEI = 1000000000000000000; // 10 ^ 18
    public static GWEI = 1000000000; // 10 ^ 9

    public static SATOSHI = 100000000; // Number of satoshi per BTC.

    public static BLOCKCHAIN_URL = 'https://blockchain.elastos.io/';

    public static IDCHAIN_DEPOSIT_ADDRESS = "XKUh4GLhFJiqAMTF6HyWQrV9pK9HcGUdfJ";

    public static ETHSC_DEPOSIT_ADDRESS = "XVbCTM7vqM1qHKsABSFH4xKN1qbp7ijpWf";
    public static ETHSC_DEPOSIT_ADDRESS_MAINNET = "XVbCTM7vqM1qHKsABSFH4xKN1qbp7ijpWf";
    public static ETHSC_DEPOSIT_ADDRESS_TESTNET = "XWCiyXM1bQyGTawoaYKx9PjRkMUGGocWub";

    // Send ELA from ETHSC to mainchain by smartcontract
    public static ETHSC_WITHDRAW_ADDRESS = "0xC445f9487bF570fF508eA9Ac320b59730e81e503";
    public static ETHSC_WITHDRAW_ADDRESS_MAINNET = "0xC445f9487bF570fF508eA9Ac320b59730e81e503";
    public static ETHSC_WITHDRAW_ADDRESS_TESTNET = "0x491bC043672B9286fA02FA7e0d6A3E5A0384A31A";
    public static ETHSC_WITHDRAW_GASPRICE = 100000000000000; // >= 10^14 and must be an integer multiple of 10^10

    public static ETHDID_DEPOSIT_ADDRESS = "XUgTgCnUEqMUKLFAg3KhGv1nnt9nn8i3wi";
    public static ETHDID_DEPOSIT_ADDRESS_MAINNET = "XUgTgCnUEqMUKLFAg3KhGv1nnt9nn8i3wi";
    public static ETHDID_DEPOSIT_ADDRESS_TESTNET = "XPsgiVQC3WucBYDL2DmPixj74Aa9aG3et8";
    public static ETHDID_DEPOSIT_ADDRESS_LRW = "XRjZS95qn6Sp5MuWjkrYxrVZNRxqb34rFd";

    // Send ELA from ETHEID to mainchain by smartcontract
    // public static ETHDID_WITHDRAW_ADDRESS = "0x8b2324fd40a74843711C9B48BC968A5FAEdd4Ef0";
    public static ETHDID_WITHDRAW_ADDRESS = "0x6F60FdED6303e73A83ef99c53963407f415e80b9";
    public static ETHDID_WITHDRAW_ADDRESS_MAINNET = "0x6F60FdED6303e73A83ef99c53963407f415e80b9";
    public static ETHDID_WITHDRAW_ADDRESS_TESTNET = "0x762a042b8B9f9f0d3179e992d965c11785219599";
    public static ETHDID_WITHDRAW_ADDRESS_LRW = "0x491bC043672B9286fA02FA7e0d6A3E5A0384A31A";

    //
    public static ETHDID_CONTRACT_ADDRESS = '0x46E5936a9bAA167b3368F4197eDce746A66f7a7a';
    public static ETHDID_CONTRACT_ADDRESS_MAINNET = '0x46E5936a9bAA167b3368F4197eDce746A66f7a7a';
    public static ETHDID_CONTRACT_ADDRESS_TESTNET = '0xF654c3cBBB60D7F4ac7cDA325d51E62f47ACD436';
    public static ETHDID_CONTRACT_ADDRESS_LRW = '0xdE51B8a094C4c135b47570E627331A830A3Be662';


    // BPoS
    public static ELA_STAKED_LOCK_ADDRESS = 'STAKEPooLXXXXXXXXXXXXXXXXXXXpP1PQ2';

    public static ETHSC_GENESISBLOCKHASH = '0x0aff28e279d246727a36ca768744803c6cdfef65d04cdc92e1df5619b02efc6a';
    public static ETHSC_GENESISBLOCKHASH_MAINNET = '0x0aff28e279d246727a36ca768744803c6cdfef65d04cdc92e1df5619b02efc6a';
    public static ETHSC_GENESISBLOCKHASH_TESTNET = '0xe45e8fae52f4b75a9d710b6b32c2b7e721fabdb2b42ec4b7ab4d0633c15e8e69';
    public static ETHSC_GENESISBLOCKHASH_LRW = '';

    public static ETHSC_CLAIMNFT_CONTRACTADDRESS = '0x06D49BB1F338420E1d8577829C079DCB4cb5eF25';
    public static ETHSC_CLAIMNFT_CONTRACTADDRESS_MAINNET = '0x06D49BB1F338420E1d8577829C079DCB4cb5eF25';
    public static ETHSC_CLAIMNFT_CONTRACTADDRESS_TESTNET = '0x95c87f9c2381d43fc7019A2F7A2EA1dd8CA47230';
    public static ETHSC_CLAIMNFT_CONTRACTADDRESS_LRW = '';

    public static ETHSC_BPoSNFT_CONTRACTADDRESS = '';
    public static ETHSC_BPoSNFT_CONTRACTADDRESS_MAINNET = '';
    public static ETHSC_BPoSNFT_CONTRACTADDRESS_TESTNET = '0xcfaBC7302a9294444741a9705E57c660aa7FC651';
    // public static ETHSC_BPoSNFT_CONTRACTADDRESS_TESTNET = '0x6C91352F89b169843D8B50E1A34B60a46e363841';
    public static ETHSC_BPoSNFT_CONTRACTADDRESS_LRW = '';

    // define in spvsdk
    public static MIN_PASSWORD_LENGTH = 8;
    public static MAX_PASSWORD_LENGTH = 128;
}
