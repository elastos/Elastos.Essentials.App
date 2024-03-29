import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { customizedSVGID } from 'src/app/helpers/picture.helpers';
import { AppmanagerService, RunnableAppCategory } from 'src/app/launcher/services/appmanager.service';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { App } from 'src/app/model/app.enum';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { CRCouncilVotingInitService } from 'src/app/voting/crcouncilvoting/services/init.service';
import { DPoSVotingInitService } from 'src/app/voting/dposvoting/services/init.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WidgetBase } from '../../base/widgetbase';

@Component({
  selector: 'widget-cyber-republic',
  templateUrl: './cyber-republic.widget.html',
  styleUrls: ['./cyber-republic.widget.scss'],
})
export class CyberRepublicWidget extends WidgetBase implements OnInit {
  public runnableApps: RunnableAppCategory = null;

  constructor(
    public theme: GlobalThemeService,
    public didService: DIDManagerService,
    private translate: TranslateService,
    public appService: AppmanagerService,
    public walletNetworkService: WalletNetworkService,
    private dposVotingInitService: DPoSVotingInitService,
    private crCouncilVotingInitService: CRCouncilVotingInitService,
  ) {
    super();
  }

  ngOnInit() {
    this.runnableApps = {
      type: 'launcher.cyber-republic',
      shouldBeDisplayed: () => this.walletNetworkService.isActiveNetworkElastos(), // Deprecated - unused
      apps: [
        {
          id: 'crcouncil',
          routerContext: App.CRCOUNCIL_VOTING,
          name: 'launcher.app-cr-council',
          description: 'launcher.app-crcouncil-description',
          icon: '/assets/launcher/apps/app-icons/council.svg',
          hasWidget: false,
          startCall: () => this.crCouncilVotingInitService.startCouncil()
        },
        {
          id: 'crproposal',
          routerContext: App.CRPROPOSAL_VOTING,
          name: 'launcher.app-cr-proposal',
          description: 'launcher.app-crproposal-description',
          icon: '/assets/launcher/apps/app-icons/proposal.svg',
          hasWidget: false,
          routerPath: '/crproposalvoting/proposals/all'
        },
        {
          id: 'crsuggestion',
          routerContext: App.CRPROPOSAL_VOTING,
          name: 'launcher.app-cr-suggestion',
          description: 'launcher.app-crsuggestion-description',
          icon: '/assets/launcher/apps/app-icons/suggestion.svg',
          hasWidget: false,
          routerPath: '/crproposalvoting/suggestions/all'
        }
      ]
    };

    this.notifyReadyToDisplay();
  }

  public customizeSVGID = customizedSVGID;
}
