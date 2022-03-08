// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import BigNumber from "bignumber.js";
import { JsonSerializer } from "../common/JsonSerializer";
import { ELAMessage } from "../ELAMessage";
import { uint256, uint8_t } from "../types";

const TOKEN_ASSET_PRECISION = "1000000000000000000";

export enum AssetType {
	Token = 0x00,
	Share = 0x01,
};

export enum AssetRecordType {
	Unspent = 0x00,
	Balance = 0x01,
};

const MaxPrecision: uint8_t = 18;


export class Asset extends ELAMessage implements JsonSerializer {
	private _name: string;
	private _description: string;
	private _precision: uint8_t;
	private _assetType: AssetType;
	private _recordType: AssetRecordType;
	private _hash: uint256;

	private static _elaAsset: BigNumber = null;

	constructor() {
		super();
		this._name = "ELA";
		this._description = "";
		this._precision = 8;
		this._assetType = AssetType.Token;
		this._recordType = AssetRecordType.Unspent;
		this._hash = Asset.GetELAAssetID();
	}

	public static newFromParams(name: string, desc: string, precision: uint8_t, assetType: AssetType, recordType: AssetRecordType): Asset {
		let newAsset = new Asset();
		newAsset._name = name;
		newAsset._description = desc;
		newAsset._precision = precision;
		newAsset._assetType = assetType;
		newAsset._recordType = recordType;
		return newAsset;
	}

	/* Asset::Asset(const Asset &asset) {
		this->operator=(asset);
	} */

	public static newFromAsset(asset: Asset): Asset {
		let newAsset = new Asset();
		newAsset._name = asset._name;
		newAsset._description = asset._description;
		newAsset._precision = asset._precision;
		newAsset._assetType = asset._assetType;
		newAsset._recordType = asset._recordType;
		newAsset._hash = asset._hash;
		return newAsset;
	}

	/*size_t Asset::EstimateSize() const {
		size_t size = 0;
		ByteStream stream;

		size += stream.WriteVarUint(_name.size());
		size += _name.size();
		size += stream.WriteVarUint(_description.size());
		size += _description.size();
		size += 3;

		return size;
	}

	 void Asset::Serialize(ByteStream &stream) const {
		stream.WriteVarString(_name);
		stream.WriteVarString(_description);
		stream.WriteBytes(&_precision, 1);
		stream.WriteBytes(&_assetType, 1);
		stream.WriteBytes(&_recordType, 1);
	}

	bool Asset::Deserialize(const ByteStream &stream) {
		if (!stream.ReadVarString(_name)) {
			Log::error("Asset payload deserialize name fail");
			return false;
		}

		if (!stream.ReadVarString(_description)) {
			Log::error("Asset payload deserialize description fail");
			return false;
		}

		if (!stream.ReadBytes(&_precision, 1)) {
			Log::error("Asset payload deserialize precision fail");
			return false;
		}

		if (!stream.ReadBytes(&_assetType, 1)) {
			Log::error("Asset payload deserialize asset type fail");
			return false;
		}

		if (!stream.ReadBytes(&_recordType, 1)) {
			Log::error("Asset payload deserialize record type fail");
			return false;
		}

		if (_name == "ELA") {
			_hash = Asset::GetELAAssetID();
		} else {
			_hash = 0;
			GetHash();
		}

		return true;
	}

	nlohmann::json Asset::ToJson() const {
		nlohmann::json j;

		j["Name"] = _name;
		j["Description"] = _description;
		j["Precision"] = _precision;
		j["AssetType"] = _assetType;
		j["RecordType"] = _recordType;

		return j;
	}

	void Asset::FromJson(const nlohmann::json &j) {
		_name = j["Name"].get<std::string>();
		_description = j["Description"].get<std::string>();
		_precision = j["Precision"].get<uint8_t>();
		_assetType = j["AssetType"].get<AssetType>();
		_recordType = j["RecordType"].get<AssetRecordType>();

		if (_name == "ELA") {
			_hash = Asset::GetELAAssetID();
		} else {
			_hash = 0;
			GetHash();
		}
	}*/

	public static GetELAAssetID(): uint256 {
		if (Asset._elaAsset === null) {
			Asset._elaAsset = new BigNumber("a3d0eaa466df74983b5d7c543de6904f4c9418ead5ffd6d25814234a96db37b0", 16);
		}
		return Asset._elaAsset;
	}

	/*const uint256 &Asset::GetHash() const {
		if (_hash == 0) {
			ByteStream stream;
			Serialize(stream);
			_hash = sha256_2(stream.GetBytes());
		}
		return _hash;
	}

	void Asset::SetHash(const uint256 &hash) {
		_hash = hash;
	}

	bool Asset::operator==(const Asset &asset) const {
		return _name == asset._name &&
				 _description == asset._description &&
				 _precision == asset._precision &&
				 _assetType == asset._assetType &&
				 _recordType == asset._recordType;
	} */
}