import { Logger } from "../logger";
import { WalletAlreadyExistException } from "../model/exceptions/walletalreadyexist.exception";
import { Web3Exception } from "../model/exceptions/web3.exception";

/**
 * Converts 0xABCDEFG into 0xAB...FG or ABCDEFG into AB...FG
 */
export const reducedWalletAddress = (address: string): string => {
  if (!address)
    return null;

  if (address.length < 12) // Should not happen
    return address;

  let hasPrefix = false;
  let workedAddress = address;
  if (address.startsWith("0x")) {
    hasPrefix = true;
    workedAddress = workedAddress.replace("0x", "");
  }

  return `${hasPrefix ? '0x' : ''}${workedAddress.substr(0, 5)}...${workedAddress.substr(workedAddress.length - 5, 5)}`;
}

export class WalletExceptionHelper {
    /**
     * From a raw JS exception, try to extract more usable information and return clearer
     * exception types such as Web3Exception.
     */
    static reworkedWeb3Exception(e: any) {
      if (e && e.message) {
        if (e.message.includes("Invalid JSON response")) {
            return new Web3Exception();
        }
      }

      Logger.log("wallet", "No specific exception info");
      return e; // No more info - return the raw error.
    }

    /**
     * From a raw JS exception, try to extract more usable information and return clearer
     * exception types such as WalletAlreadyExistException.
     */
    static reworkedWalletJSException(e: any) {
        if (e && e.reason) {
            if (e.reason.includes("Master wallet already exist")) {
                return new WalletAlreadyExistException();
            }
        }

        Logger.log("wallet", "No specific exception info");
        return e; // No more info - return the raw error.
    }
}
