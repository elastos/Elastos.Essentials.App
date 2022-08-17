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

import BigNumber from "bignumber.js";
import { Logger } from "../../logger";
import { ELAAddressHelper } from "./ela.address";
import { ELATransactionSigner } from "./ela.transaction.signer";

// TxAttributes:
// enum Usage {
//   Nonce = 0x00,
//   Script = 0x20,
//   DescriptionUrl = 0x91,
//   Description = 0x90,
//   Memo = 0x81,
//   Confirmations = 0x92
// };

export type TX_Content = {
  TxType: number,
  LockTime: number,
  PayloadVersion: number,
  TxAttributes: any[],
  UTXOInputs: any[],
  Outputs: any[],
  Programs: any[],
  Version?: number
}

const VERSION9 = 9;
const ZERO = new BigNumber(0, 10);
const FEE_SATS = new BigNumber(100, 10);
const SELA = new BigNumber('100000000', 10);

const elaAssetId = 'A3D0EAA466DF74983B5D7C543DE6904F4C9418EAD5FFD6D25814234A96DB37B0';

export class ELATransactionFactory {

  static async createSignedSendToTx(privateKey, unspentTransactionOutputs, sendToAddress, sendAmount, feeAmountSats, feeAccount, txMemo): Promise<string> {
    if (Number.isNaN(sendAmount)) {
      throw new Error(`sendAmount ${sendAmount} is not a number`);
    }
    if (Number.isNaN(feeAmountSats)) {
      throw new Error(`feeAmountSats ${feeAmountSats} is not a number`);
    }
    const publicKey = await ELAAddressHelper.getPublic(privateKey);
    const tx = this.createUnsignedSendToTx(unspentTransactionOutputs, sendToAddress, sendAmount, publicKey, feeAmountSats, feeAccount, txMemo);
    const signature = await ELATransactionSigner.getSignature(tx, privateKey);
    const encodedSignedTx = ELATransactionSigner.addSignatureToTx(tx, publicKey, signature);

    // Logger.log('wallet', 'createSignedSendToTx.signedTx ' + JSON.stringify(tx));

    Logger.log('wallet', 'createSignedSendToTx.encodedSignedTx ' + JSON.stringify(encodedSignedTx));
    return encodedSignedTx;
  }

  static createUnsignedSendToTx = async (unspentTransactionOutputs, sendToAddress, sendAmount, publicKey, feeAmountSats, feeAccount, txMemo) => {
    if (unspentTransactionOutputs == undefined) {
      throw new Error(`unspentTransactionOutputs is undefined`);
    }
    if (sendToAddress == undefined) {
      throw new Error(`sendToAddress is undefined`);
    }
    if (sendAmount == undefined) {
      throw new Error(`sendAmount is undefined`);
    }
    if (publicKey == undefined) {
      throw new Error(`publicKey is undefined`);
    }
    if (feeAmountSats == undefined) {
      throw new Error(`feeAmount is undefined`);
    }
    if (feeAccount == undefined) {
      throw new Error(`feeAccount is undefined`);
    }
    /* eslint-disable */
    const sendAmountSats = new BigNumber(sendAmount, 10);
    /* eslint-enable */
    return await this.createUnsignedSendToTxSats(unspentTransactionOutputs, sendToAddress, sendAmountSats, publicKey, feeAmountSats, feeAccount, txMemo);
  };

  static async createUnsignedSendToTxSats(unspentTransactionOutputs, sendToAddress, sendAmountSats, publicKey, feeAmountStr, feeAccount, txMemo) {
    if (unspentTransactionOutputs == undefined) {
      throw new Error(`unspentTransactionOutputs is undefined`);
    }
    if (sendToAddress == undefined) {
      throw new Error(`sendToAddress is undefined`);
    }
    if (sendAmountSats == undefined) {
      throw new Error(`sendAmount is undefined`);
    }
    if (publicKey == undefined) {
      throw new Error(`publicKey is undefined`);
    }
    if (feeAmountStr == undefined) {
      throw new Error(`feeAmountStr is undefined`);
    }
    if (feeAccount == undefined) {
      throw new Error(`feeAccount is undefined`);
    }

    const address = await ELAAddressHelper.getAddressFromPublicKey(publicKey);

    const tx: TX_Content = {
      TxType: 2,
      LockTime: 0,
      PayloadVersion: 0,
      TxAttributes: [],
      UTXOInputs: [],
      Outputs: [],
      Programs: []
    }

    {
      const txAttribute = {
        Usage: 0,
        Data: '30',
      };
      tx.TxAttributes.push(txAttribute);

      if (txMemo !== undefined && txMemo !== "") {
        const txAttribute2 = {
          Usage: 0x81,
          Data: Buffer.from("type:text,msg:" + txMemo, 'utf8').toString('hex')
        };
        tx.TxAttributes.push(txAttribute2);
      }
    }

    // feeAmountStr = '4860'
    // feeAccount = 'EQNJEA8XhraX8a6SBq98ENU5QSW6nvgSHJ'
    const feeAmountSats = new BigNumber(feeAmountStr, 10);

    // const sendAmountAndFeeAmountSats = sendAmountSats.plus(feeAmountSats).plus(FEE_SATS);
    const sendAmountAndFeeAmountSats = sendAmountSats.plus(feeAmountSats);
    // const sendAmountAndFeeAmountSats = sendAmountSats.plus(FEE_SATS);

    let inputValueSats = new BigNumber(0, 10);
    const usedUtxos = new Set();

    unspentTransactionOutputs.forEach((utxo) => {
      const utxoInput = {
        TxId: utxo.TxHash.toUpperCase(),
        ReferTxOutputIndex: utxo.Index,
        Sequence: undefined
      };

      const utxoInputStr = JSON.stringify(utxoInput);
      if (!usedUtxos.has(utxoInputStr)) {
        utxoInput.Sequence = tx.UTXOInputs.length;
        tx.UTXOInputs.push(utxoInput);
        inputValueSats = inputValueSats.plus(new BigNumber(utxo.Amount, 10));
        usedUtxos.add(utxoInputStr);
      }
    });

    const changeValueSats = inputValueSats.minus(sendAmountAndFeeAmountSats);
    const sendOutput = {
      AssetID: elaAssetId,
      Value: sendAmountSats.toString(10),
      OutputLock: 0,
      Address: sendToAddress
    }
    tx.Outputs.push(sendOutput);

    const changeOutput = {
      AssetID: elaAssetId,
      Value: changeValueSats.toString(10),
      OutputLock: 0,
      Address: address
    }
    tx.Outputs.push(changeOutput);

    // Delete it.
    // {
    //   const feeOutput = {
    //     AssetID : elaAssetId,
    //     Value : feeAmountSats.toString(10),
    //     OutputLock : 0,
    //     Address : feeAccount
    //   }
    //   tx.Outputs.push(feeOutput);
    // }

    if (changeValueSats.isLessThan(ZERO)) {
      Logger.log('wallet', 'FAILURE createUnsignedSendToTxSats', changeValueSats, tx);
      return undefined;
    }

    tx.Programs = [];

    return tx;
  }

  static getMaxAmountToSpendSats(unspentTransactionOutputs, utxoMaxCount) {
    if (unspentTransactionOutputs == undefined) {
      throw new Error(`unspentTransactionOutputs is undefined`);
    }
    if (utxoMaxCount == undefined) {
      throw new Error(`utxoMaxCount is undefined`);
    }

    let inputValueSats = new BigNumber(0, 10);
    const usedUtxos = new Set();

    let i = 1
    unspentTransactionOutputs.forEach((utxo) => {
      if (utxo.valueSats.isGreaterThan(ZERO) && i < utxoMaxCount) {
        inputValueSats = inputValueSats.plus(utxo.valueSats);
        i++;
      }
    });

    const maxAmountToSpend = inputValueSats; //.dividedBy(SELA);
    return maxAmountToSpend.toString();
  }

  static updateValueSats(utxo, utxoIx) {
    /* eslint-disable */
    const valueBigNumber = new BigNumber(utxo.Value, 10);
    /* eslint-enable */
    utxo.utxoIx = utxoIx;
    utxo.valueSats = valueBigNumber.times(SELA);
  }

  static async createUnsignedVoteTx(unspentTransactionOutputs, publicKey, feeAmountSats, candidates, feeAccount) {
    if (unspentTransactionOutputs == undefined) {
      throw new Error(`unspentTransactionOutputs is undefined`);
    }
    if (publicKey == undefined) {
      throw new Error(`publicKey is undefined`);
    }
    if (feeAmountSats == undefined) {
      throw new Error(`feeAmountSats is undefined`);
    }
    if (candidates == undefined) {
      throw new Error(`candidates is undefined`);
    }
    if (feeAccount == undefined) {
      throw new Error(`feeAccount is undefined`);
    }
    const sendToAddress = ELAAddressHelper.getAddressFromPublicKey(publicKey);
    let sendAmountSats = new BigNumber(0, 10);

    const usedUtxos = new Set();
    unspentTransactionOutputs.forEach((utxo) => {
      if (utxo.valueSats.isGreaterThan(ZERO)) {
        const utxoInput = {
          TxId: utxo.Txid.toUpperCase(),
          ReferTxOutputIndex: utxo.Index
        };
        const utxoInputStr = JSON.stringify(utxoInput);
        if (!usedUtxos.has(utxoInputStr)) {
          sendAmountSats = sendAmountSats.plus(utxo.valueSats);
          usedUtxos.add(utxoInputStr);
        }
      }
    });
    sendAmountSats = sendAmountSats.minus(feeAmountSats).minus(FEE_SATS);

    const tx = await this.createUnsignedSendToTxSats(unspentTransactionOutputs, sendToAddress, sendAmountSats, publicKey, feeAmountSats, feeAccount, '');
    tx.Version = VERSION9;
    const voteOutput = tx.Outputs[0];
    voteOutput.Type = 1;
    voteOutput.Payload = {};
    voteOutput.Payload.Version = 0;
    voteOutput.Payload.Contents = [];

    const Content = {
      Votetype: 0,
      Candidates: []
    };
    voteOutput.Payload.Contents.push(Content);

    candidates.forEach((candidate) => {
      Content.Candidates.push(candidate);
    });
    return tx;
  }

  static createSignedVoteTx = async (privateKey, unspentTransactionOutputs, feeAmountSats, candidates, feeAccount): Promise<string> => {
    const publicKey = await ELAAddressHelper.getPublic(privateKey);
    const tx = this.createUnsignedVoteTx(unspentTransactionOutputs, publicKey, feeAmountSats, candidates, feeAccount);
    const signature = await ELATransactionSigner.getSignature(tx, privateKey);
    const encodedSignedTx = ELATransactionSigner.addSignatureToTx(tx, publicKey, signature);

    // Logger.log('wallet', 'createSignedSendToTx.signedTx ' + JSON.stringify(tx));

    Logger.log('wallet', 'createSignedSendToTx.encodedSignedTx ' + JSON.stringify(encodedSignedTx));
    return encodedSignedTx;
  };
}