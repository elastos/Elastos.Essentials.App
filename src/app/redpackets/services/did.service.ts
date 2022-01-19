import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { rawImageToBase64DataUrl } from 'src/app/helpers/picture.helpers';
import { DIDDocumentsService } from 'src/app/identity/services/diddocuments.service';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { UserInfo } from '../model/user.model';

@Injectable({
  providedIn: 'root'
})
export class DIDService {
  private showProfileToOthers: boolean; // Whether to send user's DID when grabbing a packet.

  constructor(
    private didDocumentsService: DIDDocumentsService,
    private storage: GlobalStorageService) {
  }

  public async onUserSignIn(): Promise<void> {
    await this.loadProfileVisibility();
  }

  public async onUserSignOut(): Promise<void> {
  }

  /**
   * From a given DID string, resolved the DID document and tries several ways to extract user
   * avatar and name.
   * 
   * A behavior subject is returned as user information will likely arrive in several steps:
   * - name first
   * - then avatar later
   */
  public fetchUserInformation(did: string): BehaviorSubject<UserInfo> {
    Logger.log("redpackets", "Fetching user information", did);

    // No info at first
    let subject = new BehaviorSubject<UserInfo>({
      did: did
    });

    void this.didDocumentsService.fetchOrAwaitDIDDocumentWithStatus(did).then(docStatus => {
      if (docStatus.checked) {
        Logger.log("redpackets", "Got DID document for did", did, docStatus.document);

        if (docStatus.document) {
          let userName = this.didDocumentsService.getRepresentativeOwnerName(docStatus.document);
          // Get the issuer icon
          let representativeIconSubject = this.didDocumentsService.getRepresentativeIcon(docStatus.document);
          if (representativeIconSubject) {
            Logger.log("redpackets", "Waiting to receive the DID representative icon");
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
          // Return nothing as the document couldn't be found
          subject.next({
            did: did
          });
        }
      }
    });

    return subject;
  }

  private async loadProfileVisibility(): Promise<void> {
    this.showProfileToOthers = await this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, "redpackets", "profilevisibility", true);
  }

  /**
   * Returns true if user wants to show his DID string/profile to others, false otherwise.
   */
  public getProfileVisibility(): boolean {
    return this.showProfileToOthers;
  }

  public setProfileVisibility(showProfile: boolean): Promise<void> {
    Logger.log("redpackets", "Changing DID profile visibility to", showProfile);

    this.showProfileToOthers = showProfile;
    return this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "redpackets", "profilevisibility", showProfile);
  }
}
