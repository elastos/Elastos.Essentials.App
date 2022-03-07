// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { bytes_t, uint168 } from "../types";

/* #define ELA_SIDECHAIN_DESTROY_ADDR "1111111111111111111114oLvT2"
#define OP_0           0x00
#define OP_PUSHDATA1   0x4c
#define OP_PUSHDATA2   0x4d
#define OP_PUSHDATA4   0x4e
#define OP_1NEGATE     0x4f
#define OP_1           0x51
#define OP_16          0x60
#define OP_DUP         0x76
#define OP_EQUAL       0x87
#define OP_EQUALVERIFY 0x88
#define OP_HASH160     0xa9
#define OP_CHECKSIG    0xac */

enum SignType {
	SignTypeInvalid = 0,
	SignTypeStandard = 0xAC,
	SignTypeDID = 0xAD,
	SignTypeMultiSign = 0xAE,
	SignTypeCrossChain = 0xAF,
	SignTypeDestroy = 0xAA,
};

enum Prefix {
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
	private _isValid: boolean;

	/* Address:: Address() {
		_isValid = false;
	} */

	/* Address::Address(const std::string &address) {
		if (address.empty()) {
			_isValid = false;
		} else {
			bytes_t payload;
			if (Base58::CheckDecode(address, payload)) {
				_programHash = uint168(payload);
				CheckValid();
			} else {
				Log::error("invalid address {}", address);
				_isValid = false;
			}
		}
	}

	Address::Address(Prefix prefix, const bytes_t &pubKey, bool did) :
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
	}

	std::string Address::String() const {
		return Base58::CheckEncode(_programHash.bytes());
	}

	const uint168 &Address::ProgramHash() const {
		return _programHash;
	}

	void Address::SetProgramHash(const uint168 &programHash) {
		_programHash = programHash;
					CheckValid();
	}

	SignType Address::PrefixToSignType(Prefix prefix) const {
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
	}

	void Address::SetRedeemScript(Prefix prefix, const bytes_t &code) {
		_code = code;
		GenerateProgramHash(prefix);
		CheckValid();
		ErrorChecker::CheckCondition(!_isValid, Error::InvalidArgument, "redeemscript is invalid");
	}

	bool Address::ChangePrefix(Prefix prefix) {
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

	Address& Address::operator=(const Address &address) {
		_programHash = address._programHash;
		_code = address._code;
		_isValid = address._isValid;
		return *this;
	}

	bool Address::operator==(const Address &address) const {
		return _isValid == address._isValid && _programHash == address._programHash;
	}

	bool Address::operator==(const std::string &address) const {
		return _isValid && this->String() == address;
	}

	bool Address::operator!=(const Address &address) const {
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

	bool Address::CheckValid() {
		if (_programHash.prefix() == PrefixDeposit ||
			_programHash.prefix() == PrefixStandard ||
			_programHash.prefix() == PrefixCrossChain ||
			_programHash.prefix() == PrefixMultiSign ||
			_programHash.prefix() == PrefixIDChain ||
			_programHash.prefix() == PrefixDestroy ||
			_programHash.prefix() == PrefixCRExpenses) {
			_isValid = true;
		} else {
			_isValid = false;
		}

		return _isValid;
	} */

}