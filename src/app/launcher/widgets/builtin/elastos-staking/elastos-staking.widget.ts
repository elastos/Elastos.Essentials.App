import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { customizedSVGID } from 'src/app/helpers/picture.helpers';
import { AppmanagerService, RunnableApp, RunnableAppCategory } from 'src/app/launcher/services/appmanager.service';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { App } from 'src/app/model/app.enum';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { DposStatus, VoteService } from 'src/app/voting/services/vote.service';
import { StakingInitService } from 'src/app/voting/staking/services/init.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WidgetBase } from '../../base/widgetbase';
import { WidgetsServiceEvents } from '../../services/widgets.events';

@Component({
  selector: 'widget-elastos-staking',
  templateUrl: './elastos-staking.widget.html',
  styleUrls: ['./elastos-staking.widget.scss'],
})
export class ElastosStakingWidget extends WidgetBase implements OnInit {
  public editing: boolean; // Widgets container is being edited

  public runnableApps: RunnableAppCategory = null;

  constructor(
    public theme: GlobalThemeService,
    public didService: DIDManagerService,
    private translate: TranslateService,
    public appService: AppmanagerService,
    public walletNetworkService: WalletNetworkService,
    public stakingInitService: StakingInitService,
    private voteService: VoteService
  ) {
    super();
  }

  ngOnInit() {
    // Watch edition mode change to show this widget in edition even if not showing in live mode.
    WidgetsServiceEvents.editionMode.subscribe(editing => {
      this.editing = editing;
    });

    // Depending on the current DPoS chain status (v1, v1 and v2, or v2), different content is shown.
    this.voteService.dPoSStatus.subscribe(status => {
      if (status === DposStatus.UNKNOWN)
        return;

      const apps: RunnableApp[] = [];
      if (status === DposStatus.DPoSV1V2 || status === DposStatus.DPoSV2) {
        apps.push({
          id: 'elastosstaking',
          routerContext: App.ELASTOS_STAKING,
          name: 'launcher.app-elastos-staking',
          description: 'launcher.app-elastos-staking-description',
          icon: '/assets/launcher/apps/app-icons/staking.svg',
          hasWidget: false,
          startCall: () => this.stakingInitService.start()
        });
      }

      this.runnableApps = {
        type: 'launcher.elastos-staking',
        shouldBeDisplayed: () => this.walletNetworkService.isActiveNetworkElastos(), // Deprecated - unused
        apps
      };
    });

    this.notifyReadyToDisplay();
  }

  public customizeSVGID = customizedSVGID;
}
