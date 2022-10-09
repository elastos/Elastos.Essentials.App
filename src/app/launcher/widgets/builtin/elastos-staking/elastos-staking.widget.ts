import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppmanagerService, RunnableAppCategory } from 'src/app/launcher/services/appmanager.service';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { App } from 'src/app/model/app.enum';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { IWidget } from '../../base/iwidget';

@Component({
  selector: 'widget-elastos-staking',
  templateUrl: './elastos-staking.widget.html',
  styleUrls: ['./elastos-staking.widget.scss'],
})
export class ElastosStakingWidget implements IWidget, OnInit {
  public forSelection: boolean; // Initialized by the widget service

  public runnableApps: RunnableAppCategory = null;

  constructor(
    public theme: GlobalThemeService,
    public didService: DIDManagerService,
    private translate: TranslateService,
    public appService: AppmanagerService,
    public walletNetworkService: WalletNetworkService
  ) { }

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
          icon: '/assets/launcher/apps/app-icons/dpos.svg', // TODO: icon
          hasWidget: false,
          startCall: async () => {
            // TODO @dongxiao: open staking screens
          }
        }
      ]
    };
  }
}
