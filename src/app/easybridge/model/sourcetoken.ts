import BigNumber from "bignumber.js";
import { BridgeableToken } from "./bridgeabletoken";

/**
 * Token that user can use in this easy bridge service.
 * Basically, tokens that have balance greater than the min bridge value requirement.
 */
export type SourceToken = {
  token: BridgeableToken;
  balance: BigNumber; // Balance in human readable format
}