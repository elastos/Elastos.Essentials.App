// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import BigNumber from "bignumber.js";
import { SubAccount } from "../account/SubAccount";
import { Error, ErrorChecker } from "../common/ErrorChecker";
import { Lockable } from "../common/Lockable";
import { Attribute, Usage } from "../transactions/Attribute";
import { Payload } from "../transactions/payload/Payload";
import { Program } from "../transactions/Program";
import { Transaction } from "../transactions/Transaction";
import { TransactionInput } from "../transactions/TransactionInput";
import { OutputArray, TransactionOutput } from "../transactions/TransactionOutput";
import { bytes_t, uint8_t, UTXOSet } from "../types";
import { Address, AddressArray } from "../walletcore/Address";

export class Wallet extends Lockable {
	//protected _walletID: string;
	//protected _chainID: string;
	//protected _subAccount: SubAccount;
	//protected  _database: DatabaseManagerPtr;

	constructor(walletID: string, chainID: string, subAccount: SubAccount) {
		super();
		/* 	_walletID(walletID + ":" + chainID),
			_chainID(chainID),
			_subAccount(subAccount),
			_database(database) {

			std::vector<std::string> txHashDPoS, txHashCRC, txHashProposal, txHashDID;

			LoadUsedAddress(); */
	}

	createTransaction(type: uint8_t, payload: Payload, utxo: UTXOSet, outputs: OutputArray, memo: string, fee: BigNumber,
		changeBack2FirstInput: boolean): Transaction {

		let memoFixed: string;
		let totalOutputAmount: BigNumber;
		let totalInputAmount: BigNumber;

		let tx = new Transaction(type, payload);
		if (memo) {
			memoFixed = "type:text,msg:" + memo;
			tx.addAttribute(new Attribute(Usage.Memo, bytes_t(memoFixed.c_str(), memoFixed.size())));
		}

		tx.addAttribute(new Attribute(Usage.Nonce, bytes_t(to_string((rand() & 0xFFFFFFFF)))));

		for (let o of outputs)
			totalOutputAmount = totalOutputAmount.plus(o.Amount());

		if (outputs)
			tx.SetOutputs(outputs);

		await this.GetLock().runExclusive(() => {
			for (let u of utxo) {
				let code: bytes_t;
				tx.AddInput(new TransactionInput(u.Hash(), u.Index()));
				if (!this._subAccount.GetCode(u.GetAddress(), code)) {
					//GetLock().unlock();
					ErrorChecker.ThrowParamException(Error.Code.Address, "Can't found code and path for input");
				}
				tx.AddUniqueProgram(new Program(code, bytes_t()));

				totalInputAmount += u.GetAmount();
			}
		});

		if (totalInputAmount.lt(totalOutputAmount.plus(fee))) {
			ErrorChecker.ThrowLogicException(Error.Code.BalanceNotEnough, "Available balance is not enough");
		} else if (totalInputAmount.gt(totalOutputAmount.plus(fee))) {
			// change
			let changeAmount: BigNumber = totalInputAmount.minus(totalOutputAmount).minus(fee);
			let changeAddress: Address;
			if (changeBack2FirstInput) {
				changeAddress = (* utxo.begin()).GetAddress();
			} else {
				let addresses: AddressArray;
				this._subAccount.GetAddresses(addresses, 0, 1, false);
				changeAddress = addresses[0];
			}
			ErrorChecker.CheckParam(!changeAddress.Valid(), Error.Code.Address, "invalid change address");
			tx.AddOutput(new TransactionOutput(changeAmount, changeAddress));
		}

		ErrorChecker.CheckLogic(tx.GetOutputs().empty(), Error.Code.InvalidArgument, "outputs empty or input amount not enough");

		tx.SetFee(fee.getUint64());
		if (this._chainID == CHAINID_MAINCHAIN)
			tx.SetVersion(Transaction:: TxVersion:: V09);

		return tx;
	}

	/*  void Wallet::GetPublickeys(nlohmann::json &pubkeys, uint32_t index, size_t count, bool internal) const {
			 boost::mutex::scoped_lock scopedLock(lock);
			 _subAccount->GetPublickeys(pubkeys, index, count, internal);
	 }

	 void Wallet::GetAddresses(AddressArray &addresses, uint32_t index, uint32_t count, bool internal) const {
			 boost::mutex::scoped_lock scopedLock(lock);
			 _subAccount->GetAddresses(addresses, index, count, internal);
}

void Wallet::GetCID(AddressArray &cid, uint32_t index, size_t count, bool internal) const {
 boost::mutex::scoped_lock scopedLock(lock);
			 _subAccount->GetCID(cid, index, count, false);
}

AddressPtr Wallet::GetOwnerDepositAddress() const {
 boost::mutex::scoped_lock scopedLock(lock);
 return AddressPtr(new Address(PrefixDeposit, _subAccount->OwnerPubKey()));
}

AddressPtr Wallet::GetCROwnerDepositAddress() const {
 boost::mutex::scoped_lock scopedLock(lock);
 return AddressPtr(new Address(PrefixDeposit, _subAccount->DIDPubKey()));
}

AddressPtr Wallet::GetOwnerAddress() const {
 boost::mutex::scoped_lock scopedLock(lock);
 return AddressPtr(new Address(PrefixStandard, _subAccount->OwnerPubKey()));
}

AddressArray Wallet::GetAllSpecialAddresses() const {
 AddressArray result;
 boost::mutex::scoped_lock scopedLock(lock);
 if (_subAccount->Parent()->GetSignType() != Account::MultiSign) {
	 // Owner address
	 result.push_back(Address(PrefixStandard, _subAccount->OwnerPubKey()));
	 // Owner deposit address
	 result.push_back(Address(PrefixDeposit, _subAccount->OwnerPubKey()));
	 // CR Owner deposit address
	 result.push_back(Address(PrefixDeposit, _subAccount->DIDPubKey()));
 }

 return result;
}

bytes_t Wallet::GetOwnerPublilcKey() const {
 boost::mutex::scoped_lock scopedLock(lock);
 return _subAccount->OwnerPubKey();
}

bool Wallet::IsDepositAddress(const Address &addr) const {
 boost::mutex::scoped_lock scopedLock(lock);

 if (_subAccount->IsProducerDepositAddress(addr))
	 return true;
 return _subAccount->IsCRDepositAddress(addr);
}

nlohmann::json Wallet::GetBasicInfo() const {
 boost::mutex::scoped_lock scopedLock(lock);
 return _subAccount->GetBasicInfo();
}

const std::string &Wallet::GetWalletID() const {
 return _walletID;
}

void Wallet::SignTransaction(const TransactionPtr &tx, const std::string &payPassword) const {
 boost::mutex::scoped_lock scopedLock(lock);
 _subAccount->SignTransaction(tx, payPassword);
}

std::string Wallet::SignWithAddress(const Address &addr, const std::string &msg, const std::string &payPasswd) const {
 boost::mutex::scoped_lock scopedLock(lock);
 Key key = _subAccount->GetKeyWithAddress(addr, payPasswd);
 return key.Sign(msg).getHex();
}

std::string Wallet::SignDigestWithAddress(const Address &addr, const uint256 &digest, const std::string &payPasswd) const {
 boost::mutex::scoped_lock scopedLock(lock);
 Key key = _subAccount->GetKeyWithAddress(addr, payPasswd);
 return key.Sign(digest).getHex();
}

bytes_t Wallet::SignWithOwnerKey(const bytes_t &msg, const std::string &payPasswd) {
 boost::mutex::scoped_lock scopedLock(lock);
 Key key = _subAccount->DeriveOwnerKey(payPasswd);
 return key.Sign(msg);
}

	 void Wallet::LoadUsedAddress() {
	 } */

}