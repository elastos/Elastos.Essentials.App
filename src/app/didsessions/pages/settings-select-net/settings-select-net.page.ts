import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNetworksService } from 'src/app/services/global.networks.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { UXService } from '../../services/ux.service';

declare let didManager: DIDPlugin.DIDManager;

@Component({
  selector: 'app-select-net',
  templateUrl: './settings-select-net.page.html',
  styleUrls: ['./settings-select-net.page.scss'],
})
export class SettingsSelectNetPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  public availableNetworkTemplates: string[] = [];
  public selectedNetworkTemplate: string = null;

  constructor(
    public translate: TranslateService,
    public theme: GlobalThemeService,
    public uxService: UXService,
    private globalNetworksService: GlobalNetworksService,
    private globalNavService: GlobalNavService
  ) { }

  ngOnInit() {
  }

  async ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('settings.choose-network'));
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: 'back', iconPath: BuiltInIcon.BACK });
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      this.uxService.onTitleBarItemClicked(icon);
    });

    this.availableNetworkTemplates = this.globalNetworksService.getAvailableNetworkTemplate();

    this.selectedNetworkTemplate = await this.globalNetworksService.getActiveNetworkTemplate();
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  async selectNetworkTemplate(
    networkTemplate: string
  ) {
    Logger.log('didsessions', 'Dev preference set to ' + networkTemplate);
    if (this.selectedNetworkTemplate !== networkTemplate) {
      this.selectedNetworkTemplate = networkTemplate;
      await this.globalNetworksService.setActiveNetworkTemplate(networkTemplate);
      await this.resetDIDManager();

      void this.globalNavService.showRestartPrompt();
    }
  }

  resetDIDManager(): Promise<void> {
    return new Promise((resolve, reject) => {
        Logger.log('didsessions', "resetDIDManager")
        didManager.reset(() => {
            resolve();
        }, (err) => {
            Logger.error('didsessions', err);
            resolve();
        });
    });
}
}
