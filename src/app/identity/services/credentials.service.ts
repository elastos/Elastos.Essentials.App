import { Injectable, NgZone } from "@angular/core";
import { ToastController } from "@ionic/angular";
import { Events } from "src/app/services/events.service";
import { DIDURL } from "../model/didurl.model";
import { VerifiableCredential } from "../model/verifiablecredential.model";
import { AuthService } from "./auth.service";
import { DIDService } from "./did.service";
import { LocalStorage } from "./localstorage";
import { Native } from "./native";

@Injectable({
  providedIn: "root",
})
export class CredentialsService {
  constructor(
    public zone: NgZone,
    public toastCtrl: ToastController,
    public events: Events,
    public localStorage: LocalStorage,
    public native: Native,
    private didService: DIDService
  ) { }

  /**
   * Deletes a given credential from user identity including local store, DID document,
   * and does all the necessary laundry.
   */
  public deleteCredential(credential: VerifiableCredential): Promise<boolean> {
    return new Promise(resolve => {
      void AuthService.instance.checkPasswordThenExecute(async () => {
        let password = AuthService.instance.getCurrentUserPassword();

        // Delete locally
        await this.didService.getActiveDid().deleteCredential(new DIDURL(credential.pluginVerifiableCredential.getId()), true);

        // Delete from local DID document
        let currentDidDocument = this.didService.getActiveDid().getLocalDIDDocument();
        if (currentDidDocument.getCredentialById(new DIDURL(credential.pluginVerifiableCredential.getId()))) {
          await currentDidDocument.deleteCredential(
            credential.pluginVerifiableCredential,
            password
          );
        }

        resolve(true);
      }, () => {
        // Cancelled
        resolve(false);
      });
    });
  }
}
