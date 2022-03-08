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

import { warnLog } from "../common/Log";
import { ChainConfig } from "../Config";
import { json, uint32_t } from "../types";
import { CoinInfo } from "../walletcore/CoinInfo";
import type { MasterWallet } from "./MasterWallet";

export const SELA_PER_ELA = 100000000;
export const DEPOSIT_OR_WITHDRAW_FEE = 10000;

// TODO: merge methods doc from ISubwallet.h
export abstract class SubWallet {
	protected _parent: MasterWallet;
	protected _info: CoinInfo;
	protected _config: ChainConfig;

	/* #define WarnLog() SPVLOG_WARN("SubWallet::{} should not be here", GetFunName())

			SubWallet::SubWallet(const CoinInfoPtr &info,
								 const ChainConfigPtr &config,
								 MasterWallet *parent) :
				_parent(parent),
				_info(info),
				_config(config) {
			}

			SubWallet::~SubWallet() {
			}

					void SubWallet::FlushData() {
					WarnLog();
					}*/

	//default implement ISubWallet
	public getChainID(): string {
		return this._info.getChainID();
	}

	public GetBasicInfo(): json {
		//ArgInfo("{} {}", GetSubWalletID(), GetFunName());

		return {
			Info: {},
			ChainID: this._info.getChainID()
		}
	}

	public getAddresses(index: uint32_t, count: uint32_t, internal = false): json {
		warnLog();
		return {};
	}

	public getPublicKeys(index: uint32_t, count: uint32_t, internal = false): json {
		warnLog();
		return {};
	}

	public SignTransaction(tx: json, passwd: string): json {
		warnLog();
		return {};
	}

	public SignDigest(address: string, digest: string, passwd: string): string {
		warnLog();
		return "";
	}

	public VerifyDigest(publicKey: string, digest: string, signature: string): boolean {
		warnLog();
		return false;
	}

	protected getSubWalletID(): string {
		return this._parent.getWalletID() + ":" + this._info.getChainID();
	}
}
