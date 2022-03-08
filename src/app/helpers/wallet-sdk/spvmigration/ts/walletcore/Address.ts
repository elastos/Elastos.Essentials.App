// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Error, ErrorChecker } from "../common/ErrorChecker";
import { Log } from "../common/Log";
import { bytes_t, uint168 } from "../types";
import { Base58 } from "./Base58";

export const ELA_SIDECHAIN_DESTROY_ADDR = "1111111111111111111114oLvT2";
export const OP_0 = 0x00;
export const OP_PUSHDATA1 = 0x4c;
export const OP_PUSHDATA2 = 0x4d;
export const OP_PUSHDATA4 = 0x4e;
export const OP_1NEGATE = 0x4f
export const OP_1 = 0x51;
export const OP_16 = 0x60;
export const OP_DUP = 0x76;
export const OP_EQUAL = 0x87;
export const OP_EQUALVERIFY = 0x88;
export const OP_HASH160 = 0xa9;
export const OP_CHECKSIG = 0xac;

export enum SignType {
	SignTypeInvalid = 0,
	SignTypeStandard = 0xAC,
	SignTypeDID = 0xAD,
	SignTypeMultiSign = 0xAE,
	SignTypeCrossChain = 0xAF,
	SignTypeDestroy = 0xAA,
}

export enum Prefix {
	PrefixStandard = 0x21,
	PrefixMultiSign = 0x12,
	PrefixCrossChain = 0x4B,
	PrefixCRExpenses = 0x1C,
	PrefixDeposit = 0x1F,
	PrefixIDChain = 0x67,
	PrefixDestroy = 0,
}

export type AddressArray = Address[];

export class Address {
	private _programHash: uint168;
	private _code: bytes_t;
	private _isValid = false;

	public static newFromAddressString(address: string): Address {
		let addr = new Address();

		if (!address) {
			addr._isValid = false;
		} else {
			let payload: bytes_t;
			if (Base58.CheckDecode(address, payload)) {
				addr._programHash = uint168(payload);
				addr.checkValid();
			} else {
				Log.error("invalid address {}", address);
				addr._isValid = false;
			}
		}
		return addr;
	}

	public static newFromAddress(address: Address): Address {
		let addr = new Address();
		addr._programHash = address._programHash;
		addr._code = address._code;
		addr._isValid = address._isValid;
		return addr;
	}


	/*Address::Address(Prefix prefix, const bytes_t &pubKey, bool did) :
		Address(prefix, {pubKey}, 1, did) {
	}

	Address::Address(Prefix prefix, const std::vector<bytes_t> &pubkeys, uint8_t m, bool did) {
		if (pubkeys.size() == 0) {
			_isValid = false;
		} else {
			GenerateCode(prefix, pubkeys, m, did);
			GenerateProgramHash(prefix);
			CheckValid();
		}
	}

	Address::Address(const uint168 &programHash) {
		_programHash = programHash;
		CheckValid();
	}

	Address::Address(const Address &address) {
		operator=(address);
	}
*/
	public Valid(): boolean {
		return this._isValid;
	}

	/*bool Address::IsIDAddress() const {
		return _isValid && _programHash.prefix() == PrefixIDChain;
	}*/

	public String(): string {
		return Base58.CheckEncode(this._programHash.bytes());
	}

	public ProgramHash(): uint168 {
		return this._programHash;
	}

	SetProgramHash(programHash: uint168) {
		this._programHash = programHash;
		this.checkValid();
	}

	/*SignType Address::PrefixToSignType(Prefix prefix) const {
		SignType type;

		switch (prefix) {
			case PrefixIDChain:
			case PrefixStandard:
			case PrefixDeposit:
				type = SignTypeStandard;
				break;
			case PrefixCrossChain:
				type = SignTypeCrossChain;
				break;
			case PrefixMultiSign:
				type = SignTypeMultiSign;
				break;
			case PrefixDestroy:
				type = SignTypeDestroy;
				break;
			default:
				Log::error("invalid prefix {}", prefix);
				type = SignTypeInvalid;
				break;
		}

		return type;
	}*/

	public SetRedeemScript(prefix: Prefix, code: bytes_t) {
		this._code = code;
		this.GenerateProgramHash(prefix);
		this.CheckValid();
		ErrorChecker.CheckCondition(!this._isValid, Error.Code.InvalidArgument, "redeemscript is invalid");
	}

	/*bool Address::ChangePrefix(Prefix prefix) {
		ErrorChecker::CheckCondition(!_isValid, Error::Address, "can't change prefix with invalid addr");
		SignType oldSignType = SignType(_code.back());
		if (oldSignType == SignTypeMultiSign || PrefixToSignType(prefix) == SignTypeMultiSign)
			ErrorChecker::ThrowLogicException(Error::Address, "can't change to or from multi-sign prefix");

		GenerateProgramHash(prefix);
		return true;
	}

	void Address::ConvertToDID() {
		if (!_code.empty() && _programHash.prefix() == PrefixIDChain) {
			_code.back() = SignTypeDID;
			GenerateProgramHash(PrefixIDChain);
		}
	}

	const bytes_t &Address::RedeemScript() const {
		assert(!_code.empty());
		return _code;
	}

	bool Address::operator<(const Address &address) const {
		return _programHash < address._programHash;
	}
*/

	public equals(address: Address | string): boolean {
		if (typeof address === "string")
			return this._isValid && this.String() === address;
		else
			return this._isValid == address._isValid && this._programHash == address._programHash;
	}

	/*	bool Address::operator!=(const Address &address) const {
			return _programHash != address._programHash;
		}

		bool Address::operator!=(const std::string &address) const {
			return this->String() != address;
		}

		void Address::GenerateCode(Prefix prefix, const std::vector<bytes_t> &pubkeys, uint8_t m, bool did) {
			ErrorChecker::CheckLogic(m > pubkeys.size() || m == 0, Error::MultiSignersCount, "Invalid m");

			if (m == 1 && pubkeys.size() == 1) {
				_code.push_back(pubkeys[0].size());
				_code += pubkeys[0];
				if (did)
					_code.push_back(SignTypeDID);
				else
					_code.push_back(PrefixToSignType(prefix));
			} else {
				ErrorChecker::CheckCondition(pubkeys.size() > sizeof(uint8_t) - OP_1, Error::MultiSignersCount,
											 "Signers should less than 205.");

				std::vector<bytes_t> sortedSigners(pubkeys.begin(), pubkeys.end());
				std::sort(sortedSigners.begin(), sortedSigners.end(), [](const bytes_t &a, const bytes_t &b) {
					return a.getHex() < b.getHex();
				});

				_code.push_back(uint8_t(OP_1 + m - 1));
				for (size_t i = 0; i < sortedSigners.size(); i++) {
					_code.push_back(uint8_t(sortedSigners[i].size()));
					_code += sortedSigners[i];
				}
				_code.push_back(uint8_t(OP_1 + sortedSigners.size() - 1));
				_code.push_back(PrefixToSignType(prefix));
			}
		}

		void Address::GenerateProgramHash(Prefix prefix) {
			bytes_t hash = hash160(_code);
			_programHash = uint168(prefix, hash);
		}
*/
	public checkValid(): boolean {
		if (this._programHash.prefix() == Prefix.PrefixDeposit ||
			this._programHash.prefix() == Prefix.PrefixStandard ||
			this._programHash.prefix() == Prefix.PrefixCrossChain ||
			this._programHash.prefix() == Prefix.PrefixMultiSign ||
			this._programHash.prefix() == Prefix.PrefixIDChain ||
			this._programHash.prefix() == Prefix.PrefixDestroy ||
			this._programHash.prefix() == Prefix.PrefixCRExpenses) {
			this._isValid = true;
		} else {
			this._isValid = false;
		}

		return this._isValid;
	}
}