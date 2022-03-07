// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ByteStream, size_t } from "./types";

export abstract class ELAMessage {
	public abstract EstimateSize(): size_t;
	public abstract Serialize(stream: ByteStream);
	public abstract Deserialize(stream: ByteStream): boolean;
}