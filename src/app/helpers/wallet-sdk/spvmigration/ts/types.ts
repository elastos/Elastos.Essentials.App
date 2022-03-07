import BigNumber from "bignumber.js";
import { ByteBuffer } from "./common/bytebuffer";

export type uint8_t = number;
export type uint16_t = number;
export type uint32_t = number;
export type uint64_t = number;
export type size_t = number;
export type bytes_t = Buffer;
export type ByteStream = ByteBuffer;
export type uint256 = BigNumber;
export type uint168 = number;
export type time_t = number;

export type UTXOCompare = {
  /* bool operator() (const UTXOPtr &x, const UTXOPtr &y) const {
    if (x->Hash() == y->Hash()) {
      return x->Index() < y->Index();
    } else {
      return x->Hash() < y->Hash();
    }
  } */
};

// Map of UTXO -> UTXOCompare - REWORK
export type UTXOSet = {
  // TODO [utxo: UTXO]: UTXOCompare
};



/**
 * Core type that represents a JSON object.
 */
export interface JSONObject {
  [x: string]: JSONValue;
}

export type JSONValue = string | number | boolean | JSONObject | JSONArray;

export interface JSONArray extends Array<string | number | boolean | JSONObject | JSONArray> { }
export type json = JSONObject;