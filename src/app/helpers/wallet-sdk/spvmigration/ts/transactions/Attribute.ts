// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { JsonSerializer } from "../common/JsonSerializer";
import { ELAMessage } from "../ELAMessage";
import { bytes_t } from "../types";


export enum Usage {
	Nonce = 0x00,
	Script = 0x20,
	DescriptionUrl = 0x91,
	Description = 0x90,
	Memo = 0x81,
	Confirmations = 0x92
}

export class Attribute extends ELAMessage implements JsonSerializer {
	private _usage: Usage = Usage.Nonce;
	private _data: bytes_t;

	public constructor(usage = Usage.Nonce, data: bytes_t = null) {
		super();
		this._usage = usage;
		this._data = data;
	}

	public static newFromAttribute(attr: Attribute) {
		return new Attribute().copyAttribute(attr);
	}

	public copyAttribute(attr: Attribute): Attribute {
		this._usage = attr._usage;
		this._data = attr._data;
		return this;
	}

	/*Attribute::Usage Attribute::GetUsage() const {
		return _usage;
	}

	const bytes_t &Attribute::GetData() const {
		return _data;
	}

	bool Attribute::IsValid() const {
		return (_usage == Attribute::Usage::Description ||
				_usage == Attribute::Usage::DescriptionUrl ||
				_usage == Attribute::Usage::Memo ||
				_usage == Attribute::Usage::Script ||
				_usage == Attribute::Usage::Nonce ||
				_usage == Attribute::Usage::Confirmations);
	}

	size_t Attribute::EstimateSize() const {
		size_t size = 0;
		ByteStream stream;

		size += 1;
		size += stream.WriteVarUint(_data.size());
		size += _data.size();

		return size;
	}

	void Attribute::Serialize(ByteStream &stream) const {
		stream.WriteUint8(_usage);
		stream.WriteVarBytes(_data);
	}

	bool Attribute::Deserialize(const ByteStream &stream) {
		if (!stream.ReadBytes(&_usage, 1)) {
			Log::error("Attribute deserialize usage fail");
			return false;
		}

		if (!IsValid()) {
			Log::error("invalid attribute usage: {}", (uint8_t)_usage);
			return false;
		}

		if (!stream.ReadVarBytes(_data)) {
			Log::error("Attribute deserialize data fail");
			return false;
		}

		return true;
	}

	nlohmann::json Attribute::ToJson() const {
		nlohmann::json j;
		j["Usage"] = _usage;
		j["Data"] = _data.getHex();

		return j;
	}

	void Attribute::FromJson(const nlohmann::json &j) {
		_usage = j["Usage"].get<Usage>();
		_data.setHex(j["Data"].get<std::string>());
	}

	bool Attribute::operator==(const Attribute &a) const {
		return _usage == a._usage && _data == a._data;
	}

	bool Attribute::operator!=(const Attribute &a) const {
		return !operator==(a);
	} */

}
