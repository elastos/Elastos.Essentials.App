import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { IdentityService } from './identity.service';
import { LanguageService } from './language.service';
import { UXService } from './ux.service';

@Injectable({
  providedIn: 'root'
})
export class DIDSessionsModuleService {
  constructor(
    private identityService: IdentityService,
    private uxService: UXService,
    private language: LanguageService
  ) {}

  public async init(): Promise<void> {
    console.log("DID Sessions service is initializing");

    this.language.init();
    this.identityService.init();
    this.uxService.init();
  }
}
