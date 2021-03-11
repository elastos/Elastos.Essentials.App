import { Injectable } from '@angular/core';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { NodesService } from './nodes.service';

@Injectable({
  providedIn: 'root'
})
export class DPoSVotingInitService {
  constructor(
    private nodesService: NodesService,
    private didSessions: GlobalDIDSessionsService
  ) {}

  public async init(): Promise<void> {
    this.didSessions.signedInIdentityListener.subscribe((signedInIdentity)=>{
      if (signedInIdentity) {
        this.nodesService.init();
      }
    });
  }
}
