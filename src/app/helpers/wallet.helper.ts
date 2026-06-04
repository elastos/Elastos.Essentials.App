import { Logger } from "../logger";
import { BiometricAuthenticationFailedException } from "../model/exceptions/biometricauthenticationfailed.exception";
import { BiometricLockedoutException } from "../model/exceptions/biometriclockedout.exception";
import { PasswordManagerCancellationException } from "../model/exceptions/passwordmanagercancellationexception";
import { WalletAlreadyExistException } from "../model/exceptions/walletalreadyexist.exception";
import { WalletNotEnoughUtxoException } from "../model/exceptions/walletnotenoughutxo.exception";
import { WalletPendingTransactionException } from "../model/exceptions/walletpendingtransaction.exception";
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

/**
 * Check if the error indicates that the RPC server is inaccessible (e.g. returned HTML error page instead of JSON)
 */
function isServerInaccessibleError(e: any): boolean {
  const getText = (): string => {
    const parts: string[] = [];
    if (e?.message && typeof e.message === "string") parts.push(e.message);
    if (e?.response?.data && typeof e.response.data === "string") parts.push(e.response.data);
    if (e?.responseText && typeof e.responseText === "string") parts.push(e.responseText);
    if (e?.data && typeof e.data === "string") parts.push(e.data);
    return parts.join(" ").toLowerCase();
  };
  const text = getText();
  if (!text) return false;

  // returned HTML instead of JSON (e.g. Cloudflare intercept page, 502/503 error page, etc.)
  if (/<!doctype\s+html>/i.test(text)) return true;
  if (/<html[\s>]/i.test(text)) return true;

  // Cloudflare /  any access restriction related
  if (text.includes("access denied")) return true;
  if (text.includes("cloudflare") && text.includes("restrict")) return true;
  if (text.includes("used cloudflare to restrict access")) return true;

  return false;
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

      if (isServerInaccessibleError(e)) {
        return new Web3Exception();
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

    static reworkedWalletTransactionException(e: any) {
        if (e && e.message) {
            if (e.message.includes("There is already an on going transaction")) {
                return new WalletPendingTransactionException();
            }

            if (e.message.includes("Insufficient Balance")) {
                return new WalletNotEnoughUtxoException();
            }
        }

        Logger.log("wallet", "No specific exception info");
        return e; // No more info - return the raw error.
    }
}
