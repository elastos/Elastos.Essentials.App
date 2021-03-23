import { Injectable } from '@angular/core';
import { App, GlobalNavService } from 'src/app/services/global.nav.service';
import { NodesService } from './nodes.service';

@Injectable({
  providedIn: 'root'
})
export class DPoSVotingInitService {
  constructor(
    private nodesService: NodesService,
    private globalNav: GlobalNavService
  ) {}

  public async init(): Promise<void> {
  }

  public async start() {
    await this.nodesService.init();
    this.globalNav.navigateTo(App.DPOS_VOTING, '/dposvoting/menu/vote');
  }
}
