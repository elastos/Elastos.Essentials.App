import { DIDPluginException } from "../model/exceptions/didplugin.exception";
import { WrongPasswordException } from "../model/exceptions/wrongpasswordexception.exception";
import { PasswordManagerCancellationException } from "../model/exceptions/passwordmanagercancellationexception";
import { BiometricAuthenticationFailedException } from "../model/exceptions/biometricauthenticationfailed.exception";
import { BiometricLockedoutException } from "../model/exceptions/biometriclockedout.exception";
import { Logger } from "src/app/logger";

export class DIDHelper {
  /**
   * From a raw JS exception, try to extract more usable information and return clearer
   * exception types such as WrongPasswordException.
   */
  static reworkedPluginException(e: any) {
    if (e) {
      if (e.code) {
        if (e.message) { // If we have code and message fields in the object, we may be a DIDPluginException type
          // TODO: Add error code enum in DID Plugin typings and don't hardcode code values here.
          if (e.code == 10016 || e.message.includes("password") || e.message.includes("WrongPasswordException"))
            return new WrongPasswordException();
        }
      }

      if (e.message) {
        if (e.message.includes("MasterPasswordCancellation"))
          return new PasswordManagerCancellationException();
        if (e.message.includes("Authentication failed") || e.message.includes("Authentication error"))
          return new WrongPasswordException();
        if (e.message.includes("BIOMETRIC_AUTHENTICATION_FAILED"))
          return new BiometricAuthenticationFailedException();
        if (e.message.includes("BIOMETRIC_LOCKED_OUT"))
          return new BiometricLockedoutException();
      }
    }

    Logger.log("DIDSessions", "No specific exception info", e);
    return e; // No more info - return the raw error.
  }
}