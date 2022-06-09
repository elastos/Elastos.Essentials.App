import { Injectable } from '@angular/core';
import { Logger } from '../logger';
import { IdentityEntry } from "../model/didsessions/identityentry";
import { GlobalPreferencesService } from './global.preferences.service';
import { GlobalService, GlobalServiceManager } from './global.service.manager';
import { GlobalStorageService } from './global.storage.service';
import { DIDSessionsStore } from './stores/didsessions.store';

declare let internalManager: InternalPlugin.InternalManager;


@Injectable({
  providedIn: 'root'
})
export class GlobalSecurityService implements GlobalService {
  public static instance: GlobalSecurityService;  // Convenient way to get this service from non-injected classes

  constructor(
    private storage: GlobalStorageService,
    private prefs: GlobalPreferencesService
  ) {
    GlobalSecurityService.instance = this;
    GlobalServiceManager.getInstance().registerService(this);
  }

  async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    await this.restoreScreenCapture();
  }

  async onUserSignOut(): Promise<void> {
    // Signing out, block screen capture
    await internalManager.setScreenCapture(false);
  }

  /**
   * Tells whether the user has been warned about the device being a rooted device. User must have
   * confirmed the warning manually.
   */
  public rootedDeviceWarningWasDismissed(): Promise<boolean> {
    return this.storage.getSetting(null, "security", "rooteddevicewarningdismissed", false);
  }

  public setRootedDeviceWarningDismissed(): Promise<void> {
    return this.storage.setSetting(null, "security", "rooteddevicewarningdismissed", true);
  }

  /**
   * Tells whether the device is rooted (android) or jailbroken (ios).
   * The detection is not 100% guaranteed but tries to warn most users with rooted devices
   * that they are taking risks by doing so.
   */
  public async isDeviceRooted(): Promise<boolean> {
    let ret = await internalManager.isDeviceRooted();
    Logger.log("security", "isDeviceRooted:", ret);
    return ret;
  }

  /**
   * Enables or disables screenshots/video capture for the current user DID session.
   */
  public async setScreenCaptureAllowed(allowScreenCapture: boolean): Promise<void> {
    await this.prefs.setPreference(DIDSessionsStore.signedInDIDString, "developer.screencapture", allowScreenCapture);
    return internalManager.setScreenCapture(allowScreenCapture);
  }

  /**
   * Tells if the current user has allowed screenshots/video capture.
   */
  public getScreenCaptureAllowed(): Promise<boolean> {
    return this.prefs.getPreference(DIDSessionsStore.signedInDIDString, "developer.screencapture");
  }

  private async restoreScreenCapture(): Promise<void> {
    await internalManager.setScreenCapture(await this.getScreenCaptureAllowed());
  }
}
