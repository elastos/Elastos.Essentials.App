import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AppmanagerService } from 'src/app/launcher/services/appmanager.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { PluginConfig, RefreshOn } from '../../base/plugin.types';
import { Widget } from '../../base/widget.interface';
import { WidgetState } from '../../base/widgetstate';
import { WidgetPluginsService } from '../../services/plugin.service';

@Component({
  selector: 'widget-plugin',
  templateUrl: './plugin.widget.html',
  styleUrls: ['./plugin.widget.scss'],
})
export class PluginWidget implements Widget, OnInit, OnDestroy {
  public forSelection: boolean; // Initialized by the widget service

  private widgetState: WidgetState = null;
  public config: PluginConfig<any> = null;

  private refreshWidgetTimer: any = null;
  private networkChangeSub: Subscription = null;

  constructor(
    public theme: GlobalThemeService,
    public appService: AppmanagerService,
    private widgetsPluginsService: WidgetPluginsService,
    private walletNetworkService: WalletNetworkService
  ) { }

  ngOnInit() {
    // If not created for selection (live mode), start the loop that will auto refresh the widget content
    if (!this.forSelection) {
      // Check right now
      void this.checkRightTimeToRefreshWidgetContent();
    }

    this.networkChangeSub = this.walletNetworkService.activeNetwork.subscribe(activeNetwork => {
      if (activeNetwork) {
        if (this.config.refreshon && this.config.refreshon.includes(RefreshOn.NETWORK_CHANGE)) {
          // Widget asks to refresh content on network change, so we refresh.
          void this.widgetsPluginsService.refreshPluginContent(this.widgetState, true);
        }
      }
    });

    return;
  }

  ngOnDestroy(): Promise<void> {
    console.log("DESTROYING PLUGIN WIDGET COMPONENT")

    if (this.refreshWidgetTimer) {
      clearTimeout(this.refreshWidgetTimer);
      this.refreshWidgetTimer = null;
    }

    if (this.networkChangeSub) {
      this.networkChangeSub.unsubscribe();
      this.networkChangeSub = null;
    }

    return;
  }

  /**
   * Checks if it's the right time to fetch new JSON content for this widget. We fetch often enough,
   * even if the refresh time specified in the widget is higher.
   */
  private async checkRightTimeToRefreshWidgetContent(): Promise<void> {
    if (this.config) {
      await this.widgetsPluginsService.refreshPluginContentIfRightTime(this.widgetState);
    }

    this.rearmWidgetContentRefreshTimer();
  }
  private rearmWidgetContentRefreshTimer() {
    setTimeout(() => {
      void this.checkRightTimeToRefreshWidgetContent();
    }, 30000);
  }

  public attachWidgetState(widgetState: WidgetState) {
    this.widgetState = widgetState;
    this.config = WidgetPluginsService.instance.getPluginWidgetStateConfig(widgetState);
  }
}
