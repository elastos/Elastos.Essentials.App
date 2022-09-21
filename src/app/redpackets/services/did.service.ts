import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Logger } from 'src/app/logger';
import { GlobalDIDService } from 'src/app/services/global.did.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { UserInfo } from '../../model/did/user.model';
import { DIDSessionsStore } from './../../services/stores/didsessions.store';

@Injectable({
  providedIn: 'root'
})
export class DIDService {
  private showProfileToOthers: boolean; // Whether to send user's DID when grabbing a packet.

  constructor(
    private globalDidService: GlobalDIDService,
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
  public fetchUserInformation(did: string, retrieveAvatar = true): BehaviorSubject<UserInfo> {
    return this.globalDidService.fetchUserInformation(did, retrieveAvatar);
  }

  private async loadProfileVisibility(): Promise<void> {
    this.showProfileToOthers = await this.storage.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "redpackets", "profilevisibility", true);
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
    return this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "redpackets", "profilevisibility", showProfile);
  }
}
