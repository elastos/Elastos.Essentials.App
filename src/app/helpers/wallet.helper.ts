import { Logger } from "../logger";
import { BiometricAuthenticationFailedException } from "../model/exceptions/biometricauthenticationfailed.exception";
import { BiometricLockedoutException } from "../model/exceptions/biometriclockedout.exception";
import { PasswordManagerCancellationException } from "../model/exceptions/passwordmanagercancellationexception";
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

        if (e.message.includes("No network connection available")) {
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

    /**
     * From a raw JS exception, try to extract more usable information and return clearer
     * exception types such as PasswordManagerCancellationException.
     */
     static reworkedPasswordException(e: any) {
        if (e && e.message) {
            if (e.message.includes("MasterPasswordCancellation") || e.message.includes('BIOMETRIC_DISMISSED')
                    || e.message.includes('BIOMETRIC_PIN_OR_PATTERN_DISMISSED')) {
                return new PasswordManagerCancellationException();
            }

            if (e.message.includes("Authentication error [10]")) {
                return new PasswordManagerCancellationException();
            }

            if (e.message.includes("BIOMETRIC_AUTHENTICATION_FAILED")) {
                return new BiometricAuthenticationFailedException();
            }

            if (e.message.includes("BIOMETRIC_LOCKED_OUT")) {
                return new BiometricLockedoutException();
            }
        }

        Logger.log("wallet", "No specific password exception info", e);
        return e; // No more info - return the raw error.
    }
}
