import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { rawImageToBase64DataUrl } from 'src/app/helpers/picture.helpers';
import { DIDDocumentsService } from 'src/app/identity/services/diddocuments.service';
import { Logger } from 'src/app/logger';
import { UserInfo } from '../model/did/user.model';

@Injectable({
    providedIn: 'root'
})
export class GlobalDIDService {

    constructor(
        private didDocumentsService: DIDDocumentsService) {
    }

    /**
     * From a given DID string, resolved the DID document and tries several ways to extract user
     * avatar and name.
     *
     * A behavior subject is returned as user information will likely arrive in several steps:
     * - name first
     * - then avatar later
     */
    public fetchUserInformation(did: string, retrieveAvatar = true): BehaviorSubject<UserInfo> {
        Logger.log("GlobalDIDService", "Fetching user information", did);

        if (did.indexOf(':') == -1) {
            did = "did:elastos:" + did;
        }

        // No info at first
        let subject = new BehaviorSubject<UserInfo>({
            did: did
        });

        void this.didDocumentsService.fetchOrAwaitDIDDocumentWithStatus(did).then(docStatus => {
            if (docStatus.checked) {
                Logger.log("GlobalDIDService", "Got DID document for did", did, docStatus.document);

                if (docStatus.document) {
                    let userName = this.didDocumentsService.getRepresentativeOwnerName(docStatus.document);
                    if (retrieveAvatar) {
                        // Get the issuer icon
                        let representativeIconSubject = this.didDocumentsService.getRepresentativeIcon(docStatus.document);
                        if (representativeIconSubject) {
                            Logger.log("GlobalDIDService", "Waiting to receive the DID representative icon");
                            // eslint-disable-next-line @typescript-eslint/no-misused-promises
                            representativeIconSubject.subscribe(async iconBuffer => {
                                if (iconBuffer) {
                                    subject.next({
                                        did: did,
                                        name: userName,
                                        avatarDataUrl: await rawImageToBase64DataUrl(iconBuffer)
                                    });
                                }
                                else {
                                    subject.next({
                                        did: did,
                                        name: userName,
                                        avatarDataUrl: null
                                    });
                                }
                            });
                        }
                        else {
                            console.warn("No representative icon for DID", did);
                            subject.next({
                                did: did,
                                name: userName
                            });
                        }
                    }
                    else {
                        console.warn("Requested to not fetch a representative icon", did);
                        subject.next({
                            did: did,
                            name: userName
                        });
                    }
                }
                else {
                    // Return nothing as the document couldn't be found
                    subject.next({
                        did: did
                    });
                }
            }
        });

        return subject;
    }
}
