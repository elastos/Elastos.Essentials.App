// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying

import BigNumber from "bignumber.js";
import { ByteBuffer } from "../common/bytebuffer";
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
		}

		TransactionInput &TransactionInput::operator=(const TransactionInput &input) {
			_txHash = input._txHash;
			_index = input._index;
			_sequence = input._sequence;

			return *this;
		}

		TransactionInput::TransactionInput(const uint256 &txHash, uint16_t index) :
			_txHash(txHash),
			_index(index),
			_sequence(0) {

		}*/

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

	/* bool TransactionInput::operator==(const TransactionInput &in) const {
		bool equal = _txHash == in._txHash &&
					 _index == in._index &&
					 _sequence == in._sequence;

		return equal;
	}

	bool TransactionInput::operator!=(const TransactionInput &in) const {
		return !operator==(in);
	} */

	public EstimateSize(): size_t {
		let size: size_t = 0;

		size += 32; // WAS this._txHash.size(); (uint256)
		size += 2; // sizeof(this._index);
		size += 4; // sizeof(this._sequence);

		return size;
	}

	public Serialize(stream: ByteBuffer) {
		stream.writeBNAsUInt256(this._txHash); // WAS stream.WriteBytes(this._txHash);
		stream.writeUInt16(this._index); // WAS stream.WriteUint16(this._index);
		stream.writeUInt32(this._sequence); // WAS stream.WriteUint32(this._sequence);
	}

	public Deserialize(stream: ByteBuffer): boolean {
		this._txHash = stream.readUInt256AsBN();
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

	public ToJson(): json {
		return {
			TxHash: this._txHash.toString(16), // WAS this._txHash.GetHex(),
			Index: this._index,
			Sequence: this._sequence
		};
	}

	public FromJson(j: json) {
		this._txHash = new BigNumber(j["TxHash"] as any); // WAS uint256(j["TxHash"].get<std::string>());
		this._index = j["Index"] as uint16_t; // WAS j["Index"].get<uint16_t>();
		this._sequence = j["Sequence"] as uint32_t; // WAS j["Sequence"].get<uint32_t>();
	}
}
