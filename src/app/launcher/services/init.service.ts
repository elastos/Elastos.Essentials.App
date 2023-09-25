import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { WidgetsNewsService } from '../widgets/services/news.service';
import { WidgetPluginsService } from '../widgets/services/plugin.service';
import { AppmanagerService } from './appmanager.service';
import { DIDManagerService } from './didmanager.service';
import { IntentReceiverService } from './intentreceiver.service';
import { TipsService } from './tips.service';

@Injectable({
  providedIn: 'root'
})
export class LauncherInitService extends GlobalService {
  constructor(
    public didService: DIDManagerService,
    private translate: TranslateService,
    private didSessions: GlobalDIDSessionsService,
    private appManagerService: AppmanagerService,
    private intentReceiverService: IntentReceiverService,
    private tipsService: TipsService,
    private didManager: DIDManagerService,
    private widgetPluginsService: WidgetPluginsService, // init
    private widgetNewsService: WidgetsNewsService, // init
    // private widgetFeedsNewsService: WidgetsFeedsNewsService // init
  ) {
    super();
  }

  public init(): Promise<void> {
    GlobalServiceManager.getInstance().registerService(this);

    this.didManager.init();

    return;
  }

  public onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    // No blocking services start
    this.appManagerService.init();
    this.intentReceiverService.init();
    this.tipsService.init();

    return;
  }

  public onUserSignOut(): Promise<void> {
    this.appManagerService.stop();
    this.intentReceiverService.stop();
    this.tipsService.stop();

    return;
  }
}
