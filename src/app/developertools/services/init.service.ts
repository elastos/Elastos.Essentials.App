import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { DAppService } from './dapp.service';

@Injectable({
  providedIn: 'root'
})
export class DeveloperToolsInitService {
  constructor(
    private dappService: DAppService,
    private didSessions: GlobalDIDSessionsService
  ) {
  }

  public async init(): Promise<void> {
    this.didSessions.signedInIdentityListener.subscribe((signedInIdentity)=>{
      if (signedInIdentity) {
        this.dappService.init();
      }
    });
  }
}
