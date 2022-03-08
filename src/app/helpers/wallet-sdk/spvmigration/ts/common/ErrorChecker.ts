/*
 * Copyright (c) 2019 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import BigNumber from "bignumber.js";
import { InvalidArgumentException } from "./exceptions/invalidargument.exception";
import { LogicErrorException } from "./exceptions/logic.exception";
import { Log } from "./Log";

export namespace Error {
	export enum Code {
		InvalidArgument = 20001,
		InvalidPasswd = 20002,
		WrongPasswd = 20003,
		IDNotFound = 20004,
		CreateMasterWalletError = 20005,
		CreateSubWalletError = 20006,
		JsonArrayError = 20007,
		Mnemonic = 20008,
		PubKeyFormat = 20009,
		PubKeyLength = 20010,
		DepositParam = 20011,
		WithdrawParam = 20012,
		CreateTransactionExceedSize = 20013,
		CreateTransaction = 20014,
		Transaction = 20015,
		PathNotExist = 20016,
		PayloadRegisterID = 20017,
		SqliteError = 20018,
		DerivePurpose = 20019,
		WrongAccountType = 20020,
		WrongNetType = 20021,
		InvalidCoinType = 20022,
		NoCurrentMultiSinAccount = 20023,
		MultiSignersCount = 20024,
		MultiSign = 20025,
		KeyStore = 20026,
		LimitGap = 20027,
		Wallet = 20028,
		Key = 20029,
		HexString = 20030,
		SignType = 20031,
		Address = 20032,
		Sign = 20033,
		KeyStoreNeedPhrasePassword = 20034,
		BalanceNotEnough = 20035,
		JsonFormatError = 20036,
		VoteStakeError = 20037,
		GetTransactionInput = 20038,
		InvalidTransaction = 20039,
		GetUnusedAddress = 20040,
		AccountNotSupportVote = 20041,
		WalletNotContainTx = 20042,
		DepositAmountInsufficient = 20043,
		PrivateKeyNotFound = 20044,
		InvalidRedeemScript = 20045,
		AlreadySigned = 20046,
		EncryptError = 20047,
		VerifyError = 20048,
		TxPending = 20049,
		InvalidMnemonicWordCount = 20050,
		InvalidLocalStore = 20051,
		MasterWalletNotExist = 20052,
		InvalidAsset = 20053,
		ReadConfigFileError = 20054,
		InvalidChainID = 20055,
		UnSupportOldTx = 20056,
		UnsupportOperation = 20057,
		BigInt = 20058,
		DepositNotFound = 20059,
		TooMuchInputs = 20060,
		LastVoteConfirming = 20061,
		ProposalContentTooLarge = 20062,
		ProposalHashNotMatch = 20063,
		// ethereum side chain error code
		InvalidUnitType = 31000,
		InvalidEthereumAddress = 32000,
		Other = 29999,
	}
}

export type Error = {
	Code: Error.Code;
	Message: string;
	Data?: BigNumber;
}

export namespace Exception {
	export enum Type {
		LogicError,
		InvalidArgument,
	}
}

export class ErrorChecker {
	private static MakeErrorJson(err: Error.Code, msg: string, data?: BigNumber): Error {
		return {
			Code: err,
			Message: msg,
			Data: data
		};
	}

	public static ThrowParamException(err: Error.Code, msg: string) {
		this.CheckParam(true, err, msg);
	}

	public static ThrowLogicException(err: Error.Code, msg: string) {
		this.CheckLogic(true, err, msg);
	}

	public static CheckParam(condition: boolean, err: Error.Code, msg: string) {
		this.CheckCondition(condition, err, msg, Exception.Type.InvalidArgument);
	}

	/*void ErrorChecker::CheckBigIntAmount(const std::string &amount) {
		for (size_t i = 0; i < amount.size(); ++i)
			CheckCondition(!isdigit(amount[i]), Error::InvalidArgument, "invalid bigint amount: " + amount);
	}
*/
	public static CheckLogic(condition: boolean, err: Error.Code, msg: string) {
		this.CheckCondition(condition, err, msg, Exception.Type.LogicError);
	}

	public static CheckCondition(condition: boolean, err: Error.Code, msg: string, type: Exception.Type = Exception.Type.LogicError, enableLog = true) {
		if (condition) {
			let errJson = this.MakeErrorJson(err, msg);

			if (enableLog)
				Log.error(errJson);

			if (type == Exception.Type.LogicError) {
				throw new LogicErrorException(errJson);
			} else if (type == Exception.Type.InvalidArgument) {
				throw new InvalidArgumentException(errJson);
			}
		}
	}

	/*	void ErrorChecker::CheckPassword(const std::string &password, const std::string &msg) {
			CheckCondition(password.size() < MIN_PASSWORD_LENGTH, Error::InvalidPasswd,
										 msg + " password invalid: less than " + std::to_string(MIN_PASSWORD_LENGTH),
										 Exception::InvalidArgument);

			CheckCondition(password.size() > MAX_PASSWORD_LENGTH, Error::InvalidPasswd,
										 msg + " password invalid: more than " + std::to_string(MAX_PASSWORD_LENGTH),
										 Exception::InvalidArgument);
		}

		void ErrorChecker::CheckPasswordWithNullLegal(const std::string &password, const std::string &msg) {
			if (password.empty())
				return;

			CheckPassword(password, msg);
		}

		void ErrorChecker::CheckParamNotEmpty(const std::string &argument, const std::string &msg) {
			CheckCondition(argument.empty(), Error::InvalidArgument, msg + " should not be empty",
										 Exception::InvalidArgument);
		}

		void ErrorChecker::CheckJsonArray(const nlohmann::json &jsonData, size_t count, const std::string &msg) {
			CheckCondition(!jsonData.is_array(), Error::JsonArrayError, msg + " is not json array",
										 Exception::LogicError);
			CheckCondition(jsonData.size() < count, Error::JsonArrayError,
										 msg + " json array size expect at least " + std::to_string(count), Exception::LogicError);
		}

		void ErrorChecker::CheckPathExists(const boost::filesystem::path &path, bool enableLog) {
			CheckCondition(!boost::filesystem::exists(path), Error::PathNotExist,
										 "Path '" + path.string() + "' do not exist", Exception::LogicError, enableLog);
		}

		void ErrorChecker::CheckPrivateKey(const std::string &key) {
			// TODO fix here later
			ErrorChecker::CheckCondition(key.find("xprv") != -1, Error::InvalidArgument,
																	 "Private key is not support xprv");

			ErrorChecker::CheckCondition(key.length() != 32 * 2, Error::InvalidArgument,
																	 "Private key length should be 32 bytes");
		}

		void ErrorChecker::CheckInternetDate(const std::string &date) {
			std::regex reg = std::regex("(\\d{4})-(0\\d{1}|1[0-2])-(0\\d{1}|[12]\\d{1}|3[01])T(0\\d{1}|1\\d{1}|2[0-3]):[0-5]\\d{1}:([0-5]\\d{1}Z)");
			ErrorChecker::CheckParam(!std::regex_match(date, reg), Error::InvalidArgument,
															 "date format is error. such as 2019-01-01T19:20:18Z");
		}
 */
}
