import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppmanagerService, RunnableAppCategory } from 'src/app/launcher/services/appmanager.service';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { App } from 'src/app/model/app.enum';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { CRCouncilVotingInitService } from 'src/app/voting/crcouncilvoting/services/init.service';
import { DPoSVotingInitService } from 'src/app/voting/dposvoting/services/init.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { IWidget } from '../../base/iwidget';

@Component({
  selector: 'widget-elastos-voting',
  templateUrl: './elastos-voting.widget.html',
  styleUrls: ['./elastos-voting.widget.scss'],
})
export class ElastosVotingWidget implements IWidget, OnInit {
  public forSelection: boolean; // Initialized by the widget service

  public runnableApps: RunnableAppCategory = null;

  constructor(
    public theme: GlobalThemeService,
    public didService: DIDManagerService,
    private translate: TranslateService,
    public appService: AppmanagerService,
    public walletNetworkService: WalletNetworkService,
    private dposVotingInitService: DPoSVotingInitService,
    private crCouncilVotingInitService: CRCouncilVotingInitService,
  ) { }

  ngOnInit() {
    this.runnableApps = {
      type: 'launcher.elastos-voting',
      shouldBeDisplayed: () => this.walletNetworkService.isActiveNetworkElastos(), // Deprecated - unused
      apps: [
        {
          id: 'dpos',
          routerContext: App.DPOS_VOTING,
          name: this.translate.instant('launcher.app-dpos-voting'),
          description: this.translate.instant('launcher.app-dpos-description'),
          icon: '/assets/launcher/apps/app-icons/dpos.svg',
          hasWidget: false,
          startCall: () => this.dposVotingInitService.start()
        },
        {
          id: 'dpos2',
          routerContext: App.DPOS_VOTING,
          name: this.translate.instant('launcher.app-dpos2-voting'),
          description: this.translate.instant('launcher.app-dpos2-description'),
          icon: '/assets/launcher/apps/app-icons/dpos.svg',
          hasWidget: false,
          startCall: async () => {
            // TODO @dongxiao: open dpos 2.0
          }
        }
      ]
    };
  }
}
