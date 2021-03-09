import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { DAppService } from './dapp.service';

@Injectable({
  providedIn: 'root'
})
export class DeveloperToolsInitService {
  constructor(
    private dappService: DAppService
  ) {
  }

  public async init(): Promise<void> {
    await this.dappService.init();
  }
}
