import { Injectable } from '@angular/core';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { WidgetState } from '../base/widgetstate';

@Injectable({
  providedIn: 'root'
})
export class WidgetsUIService {
  constructor(private globalIntentService: GlobalIntentService) {}

  /**
   * Lets user pick a widget in the list of all available widgets
   */
  public async selectWidget(): Promise<WidgetState> {
    let res: { result: { widgetState: WidgetState } } = await this.globalIntentService.sendIntent(
      'https://essentials.web3essentials.io/picklauncherwidget',
      {}
    );
    return res.result.widgetState;
  }
}
