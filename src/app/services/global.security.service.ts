import { Injectable } from '@angular/core';
import { GlobalStorageService } from './global.storage.service';

declare let internalManager: InternalPlugin.InternalManager;


@Injectable({
  providedIn: 'root'
})
export class GlobalSecurityService {
  public static instance: GlobalSecurityService;  // Convenient way to get this service from non-injected classes

  constructor(
    private storage: GlobalStorageService
  ) {
    GlobalSecurityService.instance = this;
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
  public isDeviceRooted(): Promise<boolean> {
    return internalManager.isDeviceRooted();
  }

  public async setScreenCapture(isEnable: boolean): Promise<void> {
    await internalManager.setScreenCapture(isEnable);
  }
}
