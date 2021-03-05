import { Injectable } from '@angular/core';
import { NodesService } from './nodes.service';

@Injectable({
  providedIn: 'root'
})
export class DPoSVotingInitService {
  constructor(
    private nodesService: NodesService
  ) {}

  public async init(): Promise<void> {
    this.nodesService.init();
  }
}
