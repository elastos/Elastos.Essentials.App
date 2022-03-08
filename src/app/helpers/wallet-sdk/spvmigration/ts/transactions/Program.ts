// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying

import { ByteStream } from "../common/bytestream";
import { JsonSerializer } from "../common/JsonSerializer";
import { Log } from "../common/Log";
import { ELAMessage } from "../ELAMessage";
import { bytes_t, json, size_t } from "../types";
import { SignType } from "../walletcore/Address";

export type ProgramPtr = Program;
export type ProgramArray = ProgramPtr[];

// file COPYING or http://www.opensource.org/licenses/mit-license.php.
export class Program extends ELAMessage implements JsonSerializer {
	private _code: bytes_t;
	private _parameter: bytes_t;

	/*
	Program::Program(const Program &program) {
		operator=(program);
	}
*/
	public static newFromParams(code: bytes_t, parameter: bytes_t): Program {
		let program = new Program();
		program._parameter = parameter;
		program._code = code;
		return program;
	}

	public static newFromProgram(p: Program): Program {
		let program = new Program();
		program._code = p._code;
		program._parameter = p._parameter;
		return program;
	}

	/*bool Program::VerifySignature(const uint256 &md) const {
		Key key;
		uint8_t signatureCount = 0;

		std::vector<bytes_t> publicKeys;
		SignType type = DecodePublicKey(publicKeys);
		if (type == SignTypeInvalid) {
			Log::error("Invalid Redeem script");
			return false;
		}

		ByteStream stream(_parameter);
		bytes_t signature;
		while (stream.ReadVarBytes(signature)) {
			bool verified = false;
			for (size_t i = 0; i < publicKeys.size(); ++i) {
				key.SetPubKey(CTElastos, publicKeys[i]);
				if (key.Verify(md, signature)) {
					verified = true;
					break;
				}
			}

			signatureCount++;
			if (!verified) {
				Log::error("Transaction signature verify failed");
				return false;
			}
		}

		if (SignType(_code.back()) == SignTypeMultiSign) {
			uint8_t m = (uint8_t)(_code[0] - OP_1 + 1);
			uint8_t n = (uint8_t)(_code[_code.size() - 2] - OP_1 + 1);

			if (signatureCount < m) {
				Log::info("Signature not enough for multi sign tx");
				return false;
			}

			if (publicKeys.size() > n) {
				Log::error("Too many signers");
				return false;
			}
		} else if (SignType(_code.back()) == SignTypeStandard) {
			if (publicKeys.size() != signatureCount) {
				return false;
			}
		}

		return true;
	}

	nlohmann::json Program::GetSignedInfo(const uint256 &md) const {
		nlohmann::json info;
		std::vector<bytes_t> publicKeys;
		SignType type = DecodePublicKey(publicKeys);
		if (type == SignTypeInvalid) {
			Log::warn("Can not decode pubkey from program");
			return info;
		}

		Key key;
		ByteStream stream(_parameter);
		bytes_t signature;
		nlohmann::json signers;
		while (stream.ReadVarBytes(signature)) {
			for (size_t i = 0; i < publicKeys.size(); ++i) {
				key.SetPubKey(CTElastos, publicKeys[i]);
				if (key.Verify(md, signature)) {
					signers.push_back(publicKeys[i].getHex());
					break;
				}
			}
		}

		if (SignType(_code.back()) == SignTypeMultiSign) {
			uint8_t m = (uint8_t)(_code[0] - OP_1 + 1);
			uint8_t n = (uint8_t)(_code[_code.size() - 2] - OP_1 + 1);
			info["SignType"] = "MultiSign";
			info["M"] = m;
			info["N"] = n;
			info["Signers"] = signers;
		} else if (SignType(_code.back()) == SignTypeStandard) {
			info["SignType"] = "Standard";
			info["Signers"] = signers;
		}

		return info;
	}

	SignType Program::DecodePublicKey(std::vector<bytes_t> &pubkeys) const {
		if (_code.size() < 33 + 2)
			return SignTypeInvalid;

		SignType signType = SignType(_code[_code.size() - 1]);
		bytes_t pubKey;

		ByteStream stream(_code);

		if (signType == SignTypeMultiSign || signType == SignTypeCrossChain) {
			stream.Skip(1);
		} else if (signType != SignTypeStandard && signType != SignTypeDID) {
			Log::error("unsupport sign type");
			return SignTypeInvalid;
		}

		while (stream.ReadVarBytes(pubKey)) {
			pubkeys.push_back(pubKey);
		}

		return signType;
	}*/

	public getCode(): bytes_t {
		return this._code;
	}

	public getParameter(): bytes_t {
		return this._parameter;
	}

	public setCode(code: bytes_t) {
		this._code = code;
	}

	public setParameter(parameter: bytes_t) {
		this._parameter = parameter;
	}

	estimateSize(): size_t {
		let size: size_t = 0;
		let stream = new ByteStream();

		if (!this._parameter) {
			if (this._code[this._code.length - 1] == SignType.SignTypeMultiSign) { // WAS SignType(this._code.back())
				uint8_t m = (uint8_t)(this._code[0] - OP_1 + 1);
				uint64_t signLen = m * 64ul;
				size += stream.writeVarUInt(signLen);
				size += signLen;
			} else if (this._code[this._code.length - 1] == SignType.SignTypeStandard) { // WAS SignType(this._code.back())
				size += 65;
			}
		} else {
			size += stream.writeVarUInt(this._parameter.length);
			size += this._parameter.length;
		}

		size += stream.writeVarUInt(this._code.length);
		size += this._code.length;

		return size;
	}

	public serialize(stream: ByteStream) {
		stream.writeVarBytes(this._parameter);
		stream.writeVarBytes(this._code);
	}

	public deserialize(stream: ByteStream): boolean {
		if (!stream.readVarBytes(this._parameter)) {
			Log.error("Program deserialize parameter fail");
			return false;
		}

		if (!stream.readVarBytes(this._code)) {
			Log.error("Program deserialize code fail");
			return false;
		}

		return true;
	}

	public toJson(): json {
		return {
			Parameter: this._parameter.toString("hex"),
			Code: this._code.toString("hex")
		}
	}

	public fromJson(j: json) {
		this._parameter = Buffer.from(j["Parameter"] as string, "hex");
		this._code = Buffer.from(j["Code"] as string, "hex");
	}

	public equals(p: Program): boolean {
		return this._code == p._code && this._parameter == p._parameter;
	}

	/*bool Program::operator!=(const Program &p) const {
		return !operator==(p);
	} */
}