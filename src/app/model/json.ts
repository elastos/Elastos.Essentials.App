/**
 * Core type that represents a JSON object.
 */
export interface JSONObject {
    [x: string]: JSONValue;
}

export type JSONValue = string|number|boolean|JSONObject|JSONArray;

export interface JSONArray extends Array<string|number|boolean|JSONObject|JSONArray> { }

