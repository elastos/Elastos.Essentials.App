import { Safe } from "../../../safes/safe";

/**
 * Safe specialized for EVM networks, with additional methods.
 */
export abstract class EVMSafe extends Safe {
  public abstract personalSign(): string // TODO - Just an example for now
}