// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ByteStream } from "../../../common/bytestream";
import { JsonSerializer } from "../../../common/JsonSerializer";
import { ELAMessage } from "../../../ELAMessage";
import { bytes_t, json } from "../../../types";

export abstract class OutputPayload extends ELAMessage implements JsonSerializer {
	public getData(): bytes_t {
		let stream: ByteStream;
		this.serialize(stream);

		return stream.getBytes();
	}

	public abstract toJson(): json;
	public abstract fromJson(j: json);

	// TODO virtual IOutputPayload &operator=(const IOutputPayload &payload) = 0;

	public abstract equals(payload: OutputPayload): boolean;
}
