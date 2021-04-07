import { Logger } from "src/app/logger";
import { DIDPluginException } from "../exceptions/didplugin.exception";
import { WrongPasswordException } from "../exceptions/wrongpasswordexception.exception";

export class DIDHelper {
    /**
     * From a raw JS exception, try to extract more usable information and return clearer
     * exception types such as WrongPasswordException.
     */
    static reworkedDIDPluginException(e: DIDPluginException) {
        if (!e || !e.message) {
          Logger.log("developertools", "No specific exception info");
          return e; // No more info - return the raw error.
        }
  
        // TODO: Add error code enum in DID Plugin typings and don't hardcode code values here.
        if (e.code == 10016|| e.message.includes("password") || e.message.includes("WrongPasswordException"))
          return new WrongPasswordException();
          
        // All other cases: return the raw error.
        return e;
      }
}