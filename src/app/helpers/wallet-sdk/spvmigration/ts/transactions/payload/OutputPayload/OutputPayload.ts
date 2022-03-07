// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { JsonSerializer } from "../../../common/JsonSerializer";
import { ELAMessage } from "../../../ELAMessage";
import { ByteStream, bytes_t } from "../../../types";

export class OutputPayload extends ELAMessage implements JsonSerializer {
	getData(): bytes_t {
		let stream: ByteStream;
		this.Serialize(stream);

		return stream.GetBytes();
	}

	// TODO virtual IOutputPayload &operator=(const IOutputPayload &payload) = 0;

	// TODO virtual bool operator==(const IOutputPayload &payload) const = 0;
}

export type OutputPayloadPtr = OutputPayload;