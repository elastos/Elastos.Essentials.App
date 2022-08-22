import BigNumber from "bignumber.js";
import { BridgeableToken } from "./bridgeabletoken";

/**
 * Token that user can use as a destination for the easy bridge service.
 */
export type DestinationToken = {
  token: BridgeableToken;
  estimatedAmount: BigNumber; // Estimated amount received, in human readable format
}