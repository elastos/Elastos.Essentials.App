import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppmanagerService, RunnableAppCategory } from 'src/app/launcher/services/appmanager.service';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { App } from 'src/app/model/app.enum';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { CRCouncilVotingInitService } from 'src/app/voting/crcouncilvoting/services/init.service';
import { DPoSVotingInitService } from 'src/app/voting/dposvoting/services/init.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { Widget } from '../../base/widget.interface';

@Component({
  selector: 'widget-elastos-voting',
  templateUrl: './elastos-voting.widget.html',
  styleUrls: ['./elastos-voting.widget.scss'],
})
export class ElastosVotingWidget implements Widget, OnInit {
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
          id: 'crcouncil',
          routerContext: App.CRCOUNCIL_VOTING,
          name: this.translate.instant('launcher.app-cr-council'),
          description: this.translate.instant('launcher.app-crcouncil-description'),
          icon: '/assets/launcher/apps/app-icons/council.svg',
          hasWidget: false,
          startCall: () => this.crCouncilVotingInitService.startCouncil()
        },
        {
          id: 'crproposal',
          routerContext: App.CRPROPOSAL_VOTING,
          name: this.translate.instant('launcher.app-cr-proposal'),
          description: this.translate.instant('launcher.app-crproposal-description'),
          icon: '/assets/launcher/apps/app-icons/proposal.svg',
          hasWidget: false,
          routerPath: '/crproposalvoting/proposals/all'
        },
        {
          id: 'crsuggestion',
          routerContext: App.CRPROPOSAL_VOTING,
          name: this.translate.instant('launcher.app-cr-suggestion'),
          description: this.translate.instant('launcher.app-crsuggestion-description'),
          icon: '/assets/launcher/apps/app-icons/suggestion.svg',
          iconDark: '/assets/launcher/apps/app-icons/suggestion_dark.svg',
          hasWidget: false,
          routerPath: '/crproposalvoting/suggestions/all'
        },
      ]
    };
    return;
  }
}
