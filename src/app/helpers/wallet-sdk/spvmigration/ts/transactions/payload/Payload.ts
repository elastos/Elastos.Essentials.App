// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ByteStream, bytes_t, json, size_t, uint8_t } from "../../types";

export abstract class Payload {
	getData(version: uint8_t): bytes_t {
		/* 	ByteStream stream;

		this.serialize(stream, version);

		return stream.GetBytes(); */
		return null; // TODO
	}

	isValid(version: uint8_t): boolean {
		return true;
	}

	abstract estimateSize(version: uint8_t): size_t /* = 0 */;

	abstract serialize(ostream: ByteStream, version: uint8_t);

	abstract deserialize(istream: ByteStream, version: uint8_t): boolean;

	abstract toJson(version: uint8_t): json;

	abstract fromJson(j: json, version: uint8_t);

	//abstract IPayload & operator=(const IPayload &payload) = 0;

	abstract equals(payload: Payload, version: uint8_t): boolean;
}