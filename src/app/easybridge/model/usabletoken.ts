import { BigNumber } from "ethers";
import { BridgeableToken } from "./bridgeabletoken";

/**
 * Token that user can use in this easy bridge service.
 * Basically, tokens that have balance greater than the min bridge value requirement.
 */
export type UsableToken = {
  token: BridgeableToken;
  balance: BigNumber; // Balance in human readable format
}