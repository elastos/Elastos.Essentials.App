// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ByteStream } from "../common/bytestream";
import { JsonSerializer } from "../common/JsonSerializer";
import { Log } from "../common/Log";
import { ELAMessage } from "../ELAMessage";
import { bytes_t, json, size_t } from "../types";

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
	}*/

	isValid(): boolean {
		return (this._usage == Usage.Description ||
			this._usage == Usage.DescriptionUrl ||
			this._usage == Usage.Memo ||
			this._usage == Usage.Script ||
			this._usage == Usage.Nonce ||
			this._usage == Usage.Confirmations);
	}

	estimateSize(): size_t {
		let size: size_t = 0;
		let stream = new ByteStream();

		size += 1;
		size += stream.writeVarUInt(this._data.length);
		size += this._data.length;

		return size;
	}

	public serialize(stream: ByteStream) {
		stream.writeUInt8(this._usage);
		stream.writeVarBytes(this._data);
	}

	public deserialize(stream: ByteStream): boolean {
		this._usage = stream.readUInt8();
		if (this._usage === null) {
			Log.error("Attribute deserialize usage fail");
			return false;
		}

		if (!this.isValid()) {
			Log.error("invalid attribute usage: ", this._usage);
			return false;
		}

		if (!stream.readVarBytes(this._data)) {
			Log.error("Attribute deserialize data fail");
			return false;
		}

		return true;
	}

	public toJson(): json {
		return {
			Usage: this._usage,
			Data: this._data.toString("hex")
		}
	}

	public fromJson(j: json) {
		this._usage = j["Usage"] as Usage;
		this._data = Buffer.from(j["Data"] as string, "hex");
	}

	public equals(a: Attribute): boolean {
		return this._usage == a._usage && this._data == a._data;
	}

	/*bool Attribute::operator!=(const Attribute &a) const {
		return !operator==(a);
	} */
}
