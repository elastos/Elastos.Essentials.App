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

// TODO: translate comments to english
@Injectable()
export class Config {
    public static DEBUG_LOGS_ENABLED = true;

    public static UTXO_CONSOLIDATE_PROMPT_THRESHOLD = 500; // Number of UTXOs after which the app will ask user to consolidate.

    public static SELA = 100000000; // Number of SELA per ELA.
    public static SELAAsBigNumber = new BigNumber(Config.SELA);

    public static WEI = 1000000000000000000; // 10 ^ 18
    public static WEIAsBigNumber = new BigNumber(Config.WEI);

    // TODO: comment what those below urls are
    public static IDCHAIN_URL: String = 'https://idchain.elastos.org/';
    public static BLOCKCHAIN_URL: String = 'https://blockchain.elastos.org/';

    // TODO: cleanup the below urls / find a better way
    // public static BLOCKCHAIN_URL: String = 'https://blockchain-beta.elastos.org/';
    //public static BLOCKCHAIN_URL: String = 'https://blockchain-regtest.elastos.org/';

    public static IDCHAIN_ADDRESS = "XKUh4GLhFJiqAMTF6HyWQrV9pK9HcGUdfJ";
    public static ETHSC_ADDRESS = "XWCiyXM1bQyGTawoaYKx9PjRkMUGGocWub";

    // Send ELA from ETHSC to mainchain by smartcontract
    public static CONTRACT_ADDRESS_MAINNET = "0xC445f9487bF570fF508eA9Ac320b59730e81e503";
    public static CONTRACT_ADDRESS_TESTNET = "0x491bC043672B9286fA02FA7e0d6A3E5A0384A31A";
    public static ETHSC_WITHDRAW_GASPRICE = 100000000000000; // >= 10^14 and must be an integer multiple of 10^10

    // define in spvsdk
    public static MIN_PASSWORD_LENGTH = 8;
    public static MAX_PASSWORD_LENGTH = 128;
}
