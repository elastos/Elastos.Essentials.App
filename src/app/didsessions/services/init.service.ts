import { Injectable } from '@angular/core';
import { IdentityService } from './identity.service';
import { UXService } from './ux.service';

@Injectable({
  providedIn: 'root'
})
export class DIDSessionsInitService {
  constructor(
    private identityService: IdentityService,
    private uxService: UXService
  ) {}

  public async init(): Promise<void> {
    console.log("DID Sessions init service is initializing");

    this.identityService.init();
    this.uxService.init();
  }
}
