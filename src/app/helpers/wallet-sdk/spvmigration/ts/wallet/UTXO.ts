// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import BigNumber from "bignumber.js";
import { TransactionInput } from "../transactions/TransactionInput";
import { uint16_t, uint256 } from "../types";
import { Address } from "../walletcore/Address";

export type UTXOArray = UTXO[];

export class UTXO {
	protected _address: Address;
	protected _amount: BigNumber;
	protected _hash: uint256;
	protected _n: uint16_t;

	/* #define TX_UNCONFIRMED INT32_MAX

		UTXO::UTXO() :
			_n(0) {
		}

		UTXO::UTXO(const UTXO &u) {
			this->operator=(u);
		}

		UTXO &UTXO::operator=(const UTXO &u) {
						this->_address = u._address;
						this->_amount = u._amount;
			this->_hash = u._hash;
						this->_n = u._n;
			return *this;
		}

		UTXO::UTXO(const uint256 &hash, uint16_t n, const Address &address, const BigInt &amount) :
			_hash(hash),
			_n(n),
			_address(address),
			_amount(amount) {
		}

		UTXO::~UTXO() {
		}

		bool UTXO::operator==(const UTXO &u) const {
			return _hash == u._hash && _n == u._n;
		}*/

	public Hash(): uint256 {
		return this._hash;
	}

	public SetHash(hash: uint256) {
		this._hash = hash;
	}

	public Index(): uint16_t {
		return this._n;
	}

	public SetIndex(index: uint16_t) {
		this._n = index;
	}

	public GetAddress(): Address {
		return this._address;
	}

	public SetAddress(address: Address) {
		this._address = address;
	}

	public GetAmount(): BigNumber {
		return this._amount;
	}

	public SetAmount(amount: BigNumber) {
		this._amount = amount;
	}

	public EqualsInput(input: TransactionInput): boolean { // WAS Equal(InputPtr)
		return this._hash == input.TxHash() && this._n == input.Index();
	}

	public Equals(hash: uint256, index: uint16_t): boolean { // WAS Equals
		return this._hash == hash && index == this._n;
	}
}
