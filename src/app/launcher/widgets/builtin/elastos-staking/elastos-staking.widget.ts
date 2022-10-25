import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { customizedSVGID } from 'src/app/helpers/picture.helpers';
import { AppmanagerService, RunnableAppCategory } from 'src/app/launcher/services/appmanager.service';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { App } from 'src/app/model/app.enum';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WidgetBase } from '../../base/widgetbase';

@Component({
  selector: 'widget-elastos-staking',
  templateUrl: './elastos-staking.widget.html',
  styleUrls: ['./elastos-staking.widget.scss'],
})
export class ElastosStakingWidget extends WidgetBase implements OnInit {
  public runnableApps: RunnableAppCategory = null;

  constructor(
    public theme: GlobalThemeService,
    public didService: DIDManagerService,
    private translate: TranslateService,
    public appService: AppmanagerService,
    public walletNetworkService: WalletNetworkService
  ) {
    super();
  }

  ngOnInit() {
    this.runnableApps = {
      type: 'launcher.elastos-staking',
      shouldBeDisplayed: () => this.walletNetworkService.isActiveNetworkElastos(), // Deprecated - unused
      apps: [
        {
          id: 'elastosstaking',
          routerContext: App.ELASTOS_STAKING,
          name: 'launcher.app-elastos-staking',
          description: 'launcher.app-elastos-staking-description',
          icon: '/assets/launcher/apps/app-icons/staking.svg',
          hasWidget: false,
          startCall: async () => {
            // TODO @dongxiao: open staking screens
          }
        }
      ]
    };

    this.notifyReadyToDisplay();
  }

  public customizeSVGID = customizedSVGID;
}
