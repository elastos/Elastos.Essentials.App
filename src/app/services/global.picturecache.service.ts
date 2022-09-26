import { Injectable } from '@angular/core';
import { GlobalStorageService } from './global.storage.service';

@Injectable({
  providedIn: 'root'
})
export class GlobalPictureCacheService {
  public static instance: GlobalPictureCacheService;  // Convenient way to get this service from non-injected classes

  constructor(private storage: GlobalStorageService) {
    GlobalPictureCacheService.instance = this;
  }

  public
}
