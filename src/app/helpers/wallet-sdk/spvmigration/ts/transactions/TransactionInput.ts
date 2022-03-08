// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying

import BigNumber from "bignumber.js";
import { ByteStream } from "../common/bytestream";
import { JsonSerializer } from "../common/JsonSerializer";
import { Log } from "../common/Log";
import { ELAMessage } from "../ELAMessage";
import { json, size_t, uint16_t, uint256, uint32_t } from "../types";

export type InputPtr = TransactionInput;
export type InputArray = InputPtr[];

export class TransactionInput extends ELAMessage implements JsonSerializer {
	private _txHash: uint256;
	private _index: uint16_t;
	private _sequence: uint32_t;

	/*	TransactionInput::TransactionInput() :
			_index(0),
			_sequence(0) {
		}

		TransactionInput::TransactionInput(const TransactionInput &input) {
			this->operator=(input);
		}*/

	public static newFromTransactionInput(input: TransactionInput): TransactionInput {
		return TransactionInput.newFromParams(input._txHash, input._index, input._sequence);
	}

	public static newFromParams(txHash: uint256, index: uint16_t, sequence = 0): TransactionInput {
		let transactionInput = new TransactionInput();
		transactionInput._txHash = txHash;
		transactionInput._index = index;
		transactionInput._sequence = sequence;
		return transactionInput;
	}

	public TxHash(): uint256 {
		return this._txHash;
	}

	public SetTxHash(hash: uint256) {
		this._txHash = hash;
	}

	public Index(): uint16_t {
		return this._index;
	}

	public SetIndex(index: uint16_t) {
		this._index = index;
	}

	Sequence(): uint32_t {
		return this._sequence;
	}

	public SetSequence(sequence: uint32_t) {
		this._sequence = sequence;
	}

	public GetSize(): size_t {
		// WAS return this._txHash.size() + sizeof(_index) + sizeof(_sequence);
		return 32 + 2 + 4; // uint256 + uint16 + uint32
	}

	public equals(ti: TransactionInput): boolean {
		let equal = this._txHash == ti._txHash &&
			this._index == ti._index &&
			this._sequence == ti._sequence;

		return equal;
	}

	/*bool TransactionInput::operator!=(const TransactionInput &in) const {
		return !operator==(in);
	} */

	public estimateSize(): size_t {
		let size: size_t = 0;

		size += 32; // WAS this._txHash.size(); (uint256)
		size += 2; // sizeof(this._index);
		size += 4; // sizeof(this._sequence);

		return size;
	}

	public serialize(stream: ByteStream) {
		stream.writeBNAsUIntOfSize(this._txHash, 32); // WAS stream.WriteBytes(this._txHash);
		stream.writeUInt16(this._index); // WAS stream.WriteUint16(this._index);
		stream.writeUInt32(this._sequence); // WAS stream.WriteUint32(this._sequence);
	}

	public deserialize(stream: ByteStream): boolean {
		this._txHash = stream.readUIntOfBytesAsBN(32);
		if (this._txHash === null) {
			Log.error("deser input txHash");
			return false;
		}

		this._index = stream.readUInt16();
		if (this._index === null) {
			Log.error("deser input index");
			return false;
		}

		this._sequence = stream.readUInt32();
		if (this._sequence === null) {
			Log.error("deser input sequence");
			return false;
		}

		return true;
	}

	public toJson(): json {
		return {
			TxHash: this._txHash.toString(16), // WAS this._txHash.GetHex(),
			Index: this._index,
			Sequence: this._sequence
		};
	}

	public fromJson(j: json) {
		this._txHash = new BigNumber(j["TxHash"] as any); // WAS uint256(j["TxHash"].get<std::string>());
		this._index = j["Index"] as uint16_t; // WAS j["Index"].get<uint16_t>();
		this._sequence = j["Sequence"] as uint32_t; // WAS j["Sequence"].get<uint32_t>();
	}
}
