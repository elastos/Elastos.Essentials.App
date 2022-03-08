// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import BigNumber from "bignumber.js";
import { JsonSerializer } from "../common/JsonSerializer";
import { json, uint256, uint32_t } from "../types";
import { Address } from "../walletcore/Address";
import { Asset } from "./Asset";
import { OutputPayload } from "./payload/OutputPayload/OutputPayload";
import { PayloadDefault } from "./payload/OutputPayload/PayloadDefault";

export enum Type {
	Default = 0x00,
	VoteOutput = 0x01,
	Mapping = 0x02,
	CrossChain = 0x03
}

export type OutputPtr = TransactionOutput;
export type OutputArray = OutputPtr[];

export class TransactionOutput implements JsonSerializer {
	private _amount: BigNumber; // to support token chain
	private _assetID: uint256;
	private _outputLock: uint32_t;
	private _address: Address;

	private _outputType: Type;

	private _payload: OutputPayload;

	/* TransactionOutput::TransactionOutput() :
			_outputLock(0),
			_outputType(Type::Default) {
		_amount.setUint64(0);
		_payload = GeneratePayload(_outputType);
	}

	TransactionOutput::TransactionOutput(const TransactionOutput &output) {
		this->operator=(output);
	}*/

	public static newFromTransactionOutput(o: TransactionOutput): TransactionOutput {
		let transactionOutput = new TransactionOutput();

		transactionOutput._amount = o._amount;
		transactionOutput._assetID = o._assetID;
		transactionOutput._address = o._address;
		transactionOutput._outputLock = o._outputLock;
		transactionOutput._outputType = o._outputType;
		transactionOutput._payload = transactionOutput.GeneratePayload(o._outputType);
		transactionOutput._payload = o._payload;

		return transactionOutput;
	}

	public static newFromParams(a: BigNumber, addr: Address, assetID: uint256 = Asset.GetELAAssetID(), type: Type = Type.Default, payload: OutputPayload = null): TransactionOutput {
		let txOutput = new TransactionOutput();
		txOutput._outputLock = 0;
		txOutput._outputType = type;

		txOutput._assetID = assetID;
		txOutput._amount = a;
		txOutput._address = addr;

		if (payload === null) {
			txOutput._payload = txOutput.GeneratePayload(txOutput._outputType);
		} else {
			txOutput._payload = payload;
		}
		return txOutput;
	}

	public GetAddress(): Address {
		return this._address;
	}

	public Amount(): BigNumber {
		return this._amount;
	}

	public SetAmount(a: BigNumber) {
		this._amount = a;
	}

	/*public estimateSize(): size_t {
		let size = 0;
		let stream = new ByteStream();

		size += this._assetID.size();
		if (this._assetID == Asset.GetELAAssetID()) {
			size += 8; // WAS sizeof(uint64_t);
		} else {
			let amountBytes: bytes_t = this._amount.getHexBytes();
			size += stream.writeVarUInt(amountBytes.length);
			size += amountBytes.length;
		}

		size += 4; // WAS sizeof(this._outputLock);
		size += this._address.ProgramHash().size();

		return size;
	}

	public serialize(ostream: ByteStream, txVersion: uint8_t) {
		ostream.writeBytes(this._assetID);

		if (this._assetID == Asset.GetELAAssetID()) {
			let bytes: bytes_t = this._amount.getHexBytes(true);
			let amount: uint64_t = 0;
			memcpy(& amount, & bytes[0], MIN(bytes.size(), sizeof(uint64_t)));
			ostream.writeBNAsUIntOfSize(amount, 8); // WAS ostream.WriteUint64(amount);
		} else {
			ostream.writeVarBytes(this._amount.getHexBytes());
		}

		ostream.writeUInt32(this._outputLock);
		ostream.writeBytes(this._address.ProgramHash());

		if (txVersion >= TxVersion.V09) {
			ostream.writeUInt8(this._outputType);
			this._payload.serialize(ostream);
		}
	}

	/*bool TransactionOutput::Deserialize(const ByteStream &istream, uint8_t txVersion) {
		if (!istream.ReadBytes(_assetID)) {
			Log::error("deserialize output assetid error");
			return false;
		}

		if (_assetID == Asset::GetELAAssetID()) {
			uint64_t amount;
			if (!istream.ReadUint64(amount)) {
				Log::error("deserialize output amount error");
				return false;
			}
			_amount.setHexBytes(bytes_t(&amount, sizeof(amount)), true);
		} else {
			bytes_t bytes;
			if (!istream.ReadVarBytes(bytes)) {
				Log::error("deserialize output BN amount error");
				return false;
			}
			_amount.setHexBytes(bytes);
		}

		if (!istream.ReadUint32(_outputLock)) {
			Log::error("deserialize output lock error");
			return false;
		}

		uint168 programHash;
		if (!istream.ReadBytes(programHash)) {
			Log::error("deserialize output program hash error");
			return false;
		}
		_address.SetProgramHash(programHash);

		if (txVersion >= Transaction::TxVersion::V09) {
			uint8_t outputType = 0;
			if (!istream.ReadUint8(outputType)) {
				Log::error("tx output deserialize output type error");
				return false;
			}
			_outputType = static_cast<Type>(outputType);

			_payload = GeneratePayload(_outputType);

			if (!_payload->Deserialize(istream)) {
				Log::error("tx output deserialize payload error");
				return false;
			}
		}

		return true;
	}*/

	public IsValid(): boolean {
		return true;
	}

	AssetID(): uint256 {
		return this._assetID;
	}

	public SetAssetID(assetId: uint256) {
		this._assetID = assetId;
	}

	public OutputLock(): uint32_t {
		return this._outputLock;
	}

	public SetOutputLock(lock: uint32_t) {
		this._outputLock = lock;
	}

	GetType(): Type {
		return this._outputType;
	}

	public SetType(type: Type) {
		this._outputType = type;
	}

	public GetPayload(): OutputPayload {
		return this._payload;
	}

	public SetPayload(payload: OutputPayload) {
		this._payload = payload;
	}

	public GeneratePayload(type: Type): OutputPayload {
		let payload: OutputPayload;

		switch (type) {
			case Type.Default:
				payload = new PayloadDefault();
				break;
			/* TODO case Type.VoteOutput:
				payload = new PayloadVote();
				break;
			case Type.CrossChain:
				payload = new PayloadCrossChain();
				break; */
			default:
				payload = null;
				break;
		}

		return payload;
	}

	public toJson(): json {
		return {
			Amount: this._amount.toString(), // WAS this._amount.getDec(),
			AssetId: this._assetID.toString(16), // WAS this._assetID.GetHex(),
			OutputLock: this._outputLock,
			ProgramHash: this._address.ProgramHash().toString(16), // WAS this._address.ProgramHash().GetHex(),
			Address: this._address.String(),
			OutputType: this._outputType,
			Payload: this._payload.toJson()
		}
	}

	public FromJson(j: json) {
		this._amount = new BigNumber(j["Amount"] as string);
		this._assetID = new BigNumber(j["AssetId"] as string, 16);
		this._outputLock = j["OutputLock"] as number;
		this._address.SetProgramHash(new BigNumber((j["ProgramHash"] as string)));

		this._outputType = j["OutputType"] as Type;
		this._payload = this.GeneratePayload(this._outputType);
		this._payload.fromJson(j["Payload"] as json);
	}

	public equals(o: TransactionOutput): boolean {
		return this._assetID.eq(o._assetID) &&
			this._amount.eq(o._amount) &&
			this._outputLock == o._outputLock &&
			this._address.equals(o._address) &&
			this._outputType == o._outputType &&
			this._payload.equals(o._payload);
	}

	/*bool TransactionOutput:: operator != (const TransactionOutput & o) const {
	return !operator == (o);;
	} */
}