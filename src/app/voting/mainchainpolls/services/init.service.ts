import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalSwitchNetworkService } from 'src/app/services/global.switchnetwork.service';

@Injectable({
  providedIn: 'root'
})
export class MainchainPollsInitService {
  constructor(private globalNav: GlobalNavService, private globalSwitchNetworkService: GlobalSwitchNetworkService) {}

  public async start(): Promise<void> {
    Logger.log('mainchainpolls', 'Starting mainchain polls app');

    // Make sure the active network is elastos mainchain, otherwise, ask user to change
    const elastosNetwork = await this.globalSwitchNetworkService.promptSwitchToElastosNetworkIfDifferent();
    if (!elastosNetwork) {
      Logger.log('mainchainpolls', 'User denied network switch or no network available');
      return; // User has denied to switch network. Can't continue.
    }

    await this.globalNav.navigateRoot(App.MAINCHAIN_POLLS, '/mainchainpolls/home');
  }
}
