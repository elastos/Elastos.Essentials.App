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
import { ELAAddressHelper } from "./ela.address";

type DecodedTx = {
  Version: number;
  TxType: number;
  PayloadVersion: number;
  TxAttributes: any;
  UTXOInputs: any;
  Outputs: any;
  LockTime: any;
  Programs: any;
}
const VERSION9 = 9;

export class ELATransactionCoder {

  static async decodeTx(encodedTx, includePrograms): Promise<any> {
    if (!Buffer.isBuffer(encodedTx)) {
      throw Error('encodedTx must be a Buffer');
    }
    if (includePrograms === undefined) {
      throw Error('includePrograms is a required parameter.');
    }
    const decodedTx: DecodedTx = {
      Version: undefined,
      TxType: undefined,
      PayloadVersion: undefined,
      TxAttributes: undefined,
      UTXOInputs: undefined,
      Outputs: undefined,
      LockTime: undefined,
      Programs: undefined
    };

    const SmartBuffer = (await import("smart-buffer")).SmartBuffer;
    const smartEncodedTx = SmartBuffer.fromBuffer(encodedTx);

    const typeOrVersion = smartEncodedTx.readInt8();

    if (typeOrVersion >= VERSION9) {
      decodedTx.Version = typeOrVersion;
      decodedTx.TxType = smartEncodedTx.readInt8();
    } else {
      decodedTx.TxType = typeOrVersion;
    }

    decodedTx.PayloadVersion = smartEncodedTx.readInt8();

    const TxAttributesLen = this.readVarUint(smartEncodedTx);

    const TxAttributes = [];
    for (let TxAttributeIx = 0; TxAttributeIx < TxAttributesLen; TxAttributeIx++) {
      const TxAttribute = {
        Usage: undefined,
        Data: undefined
      };
      TxAttribute.Usage = smartEncodedTx.readUInt8();

      const TxAttributeDataLen = this.readVarUint(smartEncodedTx);
      const TxAttributeDataBuffer = smartEncodedTx.readBuffer(TxAttributeDataLen);

      TxAttribute.Data = TxAttributeDataBuffer.toString('hex').toUpperCase();

      TxAttributes.push(TxAttribute);
    }
    decodedTx.TxAttributes = TxAttributes;

    const UTXOInputsLen = this.readVarUint(smartEncodedTx);
    const UTXOInputs = [];
    for (let UTXOInputsLenIx = 0; UTXOInputsLenIx < UTXOInputsLen; UTXOInputsLenIx++) {
      const UTXOInput = {
        TxId: undefined,
        ReferTxOutputIndex: undefined,
        Sequence: undefined
      };

      UTXOInput.TxId = smartEncodedTx.readBuffer(32).reverse().toString('hex').toUpperCase();

      UTXOInput.ReferTxOutputIndex = smartEncodedTx.readUInt16LE();

      UTXOInput.Sequence = smartEncodedTx.readUInt32LE();

      UTXOInputs.push(UTXOInput);
    }
    decodedTx.UTXOInputs = UTXOInputs;

    const OutputsLen = this.readVarUint(smartEncodedTx);
    const Outputs = [];
    for (let OutputsIx = 0; OutputsIx < OutputsLen; OutputsIx++) {
      const Output = {
        AssetID: undefined,
        Value: undefined,
        OutputLock: undefined,
        Address: undefined,
        Type: undefined,
        Payload: undefined,
      };

      Output.AssetID = smartEncodedTx.readBuffer(32).reverse().toString('hex').toUpperCase();

      const value = smartEncodedTx.readBuffer(8);
      // console.log('decodeTx.value', value);
      const valueHex = value.reverse().toString('hex');
      // console.log('decodeTx.valueHex', valueHex);
      /* eslint-disable */
      const valueBigNumber = new BigNumber(valueHex, 16);
      /* eslint-enable */
      // console.log('decodeTx.valueBigNumber', valueBigNumber);
      // console.log('decodeTx.valueBigNumber.Hex', valueBigNumber.toString(16));
      Output.Value = valueBigNumber.toString(10);
      // console.log('decodeTx.Value', Output.Value);

      Output.OutputLock = smartEncodedTx.readUInt32LE();

      const programHash = smartEncodedTx.readBuffer(21);
      // console.log('decodeTx.programHash', programHash.toString('hex'));
      Output.Address = await ELAAddressHelper.getAddressFromProgramHash(programHash);
      // console.log('decodeTx.Address', Output.Address);
      if (decodedTx.Version >= VERSION9) {
        Output.Type = smartEncodedTx.readUInt8();
        Output.Payload = {};
        if (Output.Type == 1) {
          Output.Payload.Version = smartEncodedTx.readUInt8();
          const ContentsLen = this.readVarUint(smartEncodedTx);
          Output.Payload.Contents = [];
          for (let ContentsIx = 0; ContentsIx < ContentsLen; ContentsIx++) {
            const Content = {
              Votetype: undefined,
              Candidates: undefined
            };
            Content.Votetype = smartEncodedTx.readUInt8();
            Content.Candidates = [];
            const CandidatesLen = this.readVarUint(smartEncodedTx);
            for (let CandidatesIx = 0; CandidatesIx < CandidatesLen; CandidatesIx++) {
              const CandidateLen = this.readVarUint(smartEncodedTx);
              const CandidateBuffer = smartEncodedTx.readBuffer(CandidateLen);
              const Candidate = CandidateBuffer.toString('hex').toUpperCase();
              Content.Candidates.push(Candidate);
            }
            Output.Payload.Contents.push(Content);
          }
        }
      }

      Outputs.push(Output);
    }
    decodedTx.Outputs = Outputs;

    decodedTx.LockTime = smartEncodedTx.readUInt32LE();

    const Programs = [];

    if (includePrograms) {
      const ProgramsLen = this.readVarUint(smartEncodedTx);

      // console.log('decodeTx.ProgramsLen', ProgramsLen);

      for (let ProgramIx = 0; ProgramIx < ProgramsLen; ProgramIx++) {
        const Program = {
          Parameter: undefined,
          Code: undefined
        };

        const parameterLen = this.readVarUint(smartEncodedTx);
        Program.Parameter = smartEncodedTx.readBuffer(parameterLen).toString('hex').toUpperCase();

        const codeLen = this.readVarUint(smartEncodedTx);
        Program.Code = smartEncodedTx.readBuffer(codeLen).toString('hex').toUpperCase();

        Programs.push(Program);
      }
    }

    decodedTx.Programs = Programs;

    return decodedTx;
  }

  static async encodeTx(decodedTx, includePrograms): Promise<string> {
    if (decodedTx === undefined) {
      throw Error('decodedTx is a required parameter.');
    }
    if (includePrograms === undefined) {
      throw Error('includePrograms is a required parameter.');
    }

    // console.log('encodeTx.includePrograms', includePrograms);

    const SmartBuffer = (await import("smart-buffer")).SmartBuffer;
    const encodedTx = new SmartBuffer();

    // https://github.com/elastos/Elastos.ELA/blob/master/core/types/transaction.go#L151
    if (decodedTx.Version >= VERSION9) {
      encodedTx.writeInt8(decodedTx.Version);
    }

    encodedTx.writeInt8(decodedTx.TxType);

    encodedTx.writeInt8(decodedTx.PayloadVersion);

    // https:// github.com/elastos/Elastos.ELA/blob/master/core/types/payload/transferasset.go

    this.writeVarUint(encodedTx, decodedTx.TxAttributes.length);

    decodedTx.TxAttributes.forEach((TxAttribute) => {
      // console.log('encodeTx.TxAttribute.Usage', TxAttribute.Usage);
      encodedTx.writeUInt8(TxAttribute.Usage);

      const data = Buffer.from(TxAttribute.Data, 'hex');
      this.writeVarUint(encodedTx, data.length);
      encodedTx.writeBuffer(data);
    });


    // encodedTx.writeUInt8(0xff);
    // encodedTx.writeUInt8(0xff);

    this.writeVarUint(encodedTx, decodedTx.UTXOInputs.length);
    decodedTx.UTXOInputs.forEach((UTXOInput) => {
      const txId = Buffer.from(UTXOInput.TxId, 'hex').reverse();
      encodedTx.writeBuffer(txId);

      encodedTx.writeUInt16LE(UTXOInput.ReferTxOutputIndex);

      encodedTx.writeUInt32LE(UTXOInput.Sequence);
    });

    this.writeVarUint(encodedTx, decodedTx.Outputs.length);

    decodedTx.Outputs.forEach((Output, OutputIx) => {
      // https://github.com/elastos/Elastos.ELA/blob/master/core/types/output.go

      const assetID = Buffer.from(Output.AssetID, 'hex').reverse();
      encodedTx.writeBuffer(assetID);

      // console.log('encodeTx.Value', Output.Value);
      /* eslint-disable */
      const valueBigNumber = new BigNumber(Output.Value, 10);
      /* eslint-enable */
      // console.log('encodeTx.valueBigNumber', valueBigNumber);
      // console.log('encodeTx.valueBigNumber.Hex', valueBigNumber.toString(16));
      const valueHex = valueBigNumber.toString(16).padStart(16, '0');
      // console.log('encodeTx.valueHex', valueHex);
      const value = Buffer.from(valueHex, 'hex').reverse();
      // console.log('encodeTx.value', value);
      encodedTx.writeBuffer(value);

      encodedTx.writeUInt32LE(Output.OutputLock);

      const programHash = ELAAddressHelper.getProgramHashFromAddress(Output.Address);
      encodedTx.writeBuffer(programHash);

      if (decodedTx.Version >= VERSION9) {
        encodedTx.writeInt8(Output.Type);
        if (Output.Type == 1) {
          encodedTx.writeInt8(Output.Payload.Version);
          this.writeVarUint(encodedTx, Output.Payload.Contents.length);
          Output.Payload.Contents.forEach((Content) => {
            encodedTx.writeInt8(Content.Votetype);
            this.writeVarUint(encodedTx, Content.Candidates.length);
            Content.Candidates.forEach((Candidate) => {
              const candidateId = Buffer.from(Candidate, 'hex');
              this.writeVarUint(encodedTx, candidateId.length);
              encodedTx.writeBuffer(candidateId);
            });
          });
        }
      }
    });

    encodedTx.writeUInt32LE(decodedTx.LockTime);

    if (includePrograms) {
      this.writeVarUint(encodedTx, decodedTx.Programs.length);
      decodedTx.Programs.forEach((Program) => {
        const parameter = Buffer.from(Program.Parameter, 'hex');
        this.writeVarUint(encodedTx, parameter.length);
        encodedTx.writeBuffer(parameter);

        const code = Buffer.from(Program.Code, 'hex');
        this.writeVarUint(encodedTx, code.length);
        encodedTx.writeBuffer(code);
      });
    }

    return encodedTx.toString('hex');
  }

  private static writeVarUint(smartBuffer, n) {
    if (n < 0xFD) {
      smartBuffer.writeUInt8(n);
      // 16 bit
    } else if (n <= 0xFFFF) {
      smartBuffer.writeUInt8(0xFD);
      smartBuffer.writeUInt16LE(n);
      // 32 bit
    } else if (n <= 0xFFFFFFFF) {
      smartBuffer.writeUInt8(0xFE);
      smartBuffer.writeUInt32LE(n);
      // 64 bit
    } else {
      smartBuffer.writeUInt8(0xFF);
      smartBuffer.writeUInt32LE(n >>> 0);
      smartBuffer.writeUInt32LE((n / 0x100000000) | 0);
    }
  }

  private static readVarUint(smartBuffer) {
    const n = smartBuffer.readUInt8();
    if ((n & 0xFF) < 0xFD) {
      return n & 0xFF;
    }
    if ((n & 0xFF) == 0xFD) {
      const number = smartBuffer.readUInt16LE();
      return number;
    } else if ((n & 0xFF) == 0xFE) {
      const number = smartBuffer.readUInt32LE();
      return number;
    } else if ((n & 0xFF) == 0xFF) {
      const number = smartBuffer.readUInt64LE();
      return number;
    }
    return 0;
  }
}