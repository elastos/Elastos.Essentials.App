import { Injectable } from '@angular/core';
import { rawImageToBase64DataUrl } from 'src/app/helpers/picture.helpers';
import { DIDDocumentsService } from 'src/app/identity/services/diddocuments.service';
import { Logger } from 'src/app/logger';
import { UserInfo } from '../model/user.model';

@Injectable({
  providedIn: 'root'
})
export class DIDService {
  constructor(private didDocumentsService: DIDDocumentsService) {
  }

  public fetchUserInformation(did: string): Promise<UserInfo> {
    Logger.log("redpackets", "Fetching user information", did);

    return new Promise(resolve => {
      void this.didDocumentsService.fetchOrAwaitDIDDocumentWithStatus(did).then(docStatus => {
        if (docStatus.checked) {
          Logger.log("redpackets", "Got DID document for did", did, docStatus.document);

          if (docStatus.document) {
            let userName = this.didDocumentsService.getRepresentativeOwnerName(docStatus.document);
            // Get the issuer icon
            let representativeIconSubject = this.didDocumentsService.getRepresentativeIcon(docStatus.document);
            console.log("DEBUG representativeIconSubject", representativeIconSubject);
            if (representativeIconSubject) {
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              representativeIconSubject.subscribe(async iconBuffer => {
                console.log("DEBUG", userName, iconBuffer);
                resolve({
                  did: did,
                  name: userName,
                  avatarDataUrl: await rawImageToBase64DataUrl(iconBuffer)
                });
              });
            }
            else {
              resolve({
                did: did,
                name: userName
              });
            }
          }
          else {
            // Return nothing as the document couldn't be found
            resolve({
              did: did
            });
          }
        }
      });
    });
  }
}
