// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ByteStream } from "../../common/bytestream";
import { bytes_t, json, size_t, uint8_t } from "../../types";
import { Payload } from "./Payload";

export class CoinBase extends Payload {
	private _coinBaseData: bytes_t;

	/* CoinBase::CoinBase(const bytes_t &coinBaseData) {
		_coinBaseData = coinBaseData;
	}

	CoinBase::CoinBase(const CoinBase &payload) {
		operator=(payload);
	}

	void CoinBase::SetCoinBaseData(const bytes_t &coinBaseData) {
		_coinBaseData = coinBaseData;
	}

	const bytes_t &CoinBase::GetCoinBaseData() const {
		return _coinBaseData;
	}*/

	public estimateSize(version: uint8_t): size_t {
		let size = 0;
		let stream = new ByteStream();

		size += stream.writeVarUInt(this._coinBaseData.length);
		size += this._coinBaseData.length;

		return size;
	}

	public serialize(ostream: ByteStream, version: uint8_t) {
		ostream.writeVarBytes(this._coinBaseData);
	}

	public deserialize(istream: ByteStream, version: uint8_t): boolean {
		return istream.readVarBytes(this._coinBaseData);
	}

	public toJson(version: uint8_t): json {
		return {
			CoinBaseData: this._coinBaseData.toString("hex")
		};
	}

	public fromJson(j: json, version: uint8_t) {
		this._coinBaseData = Buffer.from(j["CoinBaseData"] as string, "hex");
	}

	/*IPayload &CoinBase::operator=(const IPayload &payload) {
	try {
		const CoinBase &payloadCoinBase = dynamic_cast<const CoinBase &>(payload);
		operator=(payloadCoinBase);
	} catch (const std::bad_cast &e) {
		Log::error("payload is not instance of CoinBase");
	}

	return *this;
}*/

	public static newFromCoinbase(payload: CoinBase): CoinBase {
		let coinBase = new CoinBase();
		coinBase._coinBaseData = payload._coinBaseData;
		return coinBase;
	}

	public equals(payload: Payload, version: uint8_t): boolean {
		if (!(payload instanceof CoinBase))
			return false;

		return this._coinBaseData == payload._coinBaseData;
	}
}