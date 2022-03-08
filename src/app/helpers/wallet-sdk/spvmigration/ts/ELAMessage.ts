// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ByteStream } from "./common/bytestream";
import { size_t } from "./types";

export abstract class ELAMessage {
	public abstract estimateSize(): size_t;
	public abstract serialize(stream: ByteStream);
	public abstract deserialize(stream: ByteStream): boolean;
}