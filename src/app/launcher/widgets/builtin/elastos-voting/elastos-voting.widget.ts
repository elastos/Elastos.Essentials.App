import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { customizedSVGID } from 'src/app/helpers/picture.helpers';
import { AppmanagerService, RunnableAppCategory } from 'src/app/launcher/services/appmanager.service';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { App } from 'src/app/model/app.enum';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { CRCouncilVotingInitService } from 'src/app/voting/crcouncilvoting/services/init.service';
import { DPoS2InitService } from 'src/app/voting/dpos2/services/init.service';
import { DPoSVotingInitService } from 'src/app/voting/dposvoting/services/init.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WidgetBase } from '../../base/widgetbase';

@Component({
    selector: 'widget-elastos-voting',
    templateUrl: './elastos-voting.widget.html',
    styleUrls: ['./elastos-voting.widget.scss'],
})
export class ElastosVotingWidget extends WidgetBase implements OnInit {
  public runnableApps: RunnableAppCategory = null;

  constructor(
    public theme: GlobalThemeService,
    public didService: DIDManagerService,
    private translate: TranslateService,
    public appService: AppmanagerService,
    public walletNetworkService: WalletNetworkService,
    private dposVotingInitService: DPoSVotingInitService,
    private dpos2InitService: DPoS2InitService,
    private crCouncilVotingInitService: CRCouncilVotingInitService,
  ) {
    super();
  }

  ngOnInit() {
    this.runnableApps = {
      type: 'launcher.elastos-voting',
      shouldBeDisplayed: () => this.walletNetworkService.isActiveNetworkElastos(), // Deprecated - unused
      apps: [
        {
          id: 'dpos2',
          routerContext: App.DPOS_VOTING,
          name: 'launcher.app-dpos2-voting',
          description: 'launcher.app-dpos2-description',
          icon: '/assets/launcher/apps/app-icons/dpos.svg',
          hasWidget: false,
          startCall: () => this.dpos2InitService.start()
        },
        {
          id: 'dpos',
          routerContext: App.DPOS_VOTING,
          name: 'launcher.app-dpos-voting',
          description: 'launcher.app-dpos-description',
          icon: '/assets/launcher/apps/app-icons/dpos.svg',
          hasWidget: false,
          startCall: () => this.dposVotingInitService.start()
        }
      ]
    };

    this.notifyReadyToDisplay();
  }

  public customizeSVGID = customizedSVGID;
}
