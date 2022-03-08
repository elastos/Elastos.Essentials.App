// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ByteStream } from "../../../common/bytestream";
import { json, size_t } from "../../../types";
import { OutputPayload } from "./OutputPayload";

export class PayloadDefault extends OutputPayload {
	public static newFromPayloadDefault(payload: PayloadDefault) {
		return new PayloadDefault();
	}

	public estimateSize(): size_t {
		return 0;
	}

	public serialize(stream: ByteStream) {
	}

	public deserialize(stream: ByteStream): boolean {
		return true;
	}

	public toJson(): json {
		return {};
	}

	public fromJson(j: json) {
	}

	public equals(payload: OutputPayload): boolean {
		return payload instanceof OutputPayload;
	}
}
