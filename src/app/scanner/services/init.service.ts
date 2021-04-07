import { Injectable } from '@angular/core';
import { IntentService } from './intent.service';

@Injectable({
  providedIn: 'root'
})
export class ScannerInitService {
  constructor(
    private intentService: IntentService
  ) {}

  public async init(): Promise<void> {
    // Mandatory services start
    await this.intentService.init();
  }
}
