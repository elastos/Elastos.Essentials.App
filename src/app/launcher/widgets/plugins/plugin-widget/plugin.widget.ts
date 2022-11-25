import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AppmanagerService } from 'src/app/launcher/services/appmanager.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { PluginConfig, RefreshOn } from '../../base/pluginconfig';
import { WidgetBase } from '../../base/widgetbase';
import { WidgetState } from '../../base/widgetstate';
import { WidgetPluginsService } from '../../services/plugin.service';
import { WidgetsService } from '../../services/widgets.service';

@Component({
  selector: 'widget-plugin',
  templateUrl: './plugin.widget.html',
  styleUrls: ['./plugin.widget.scss'],
})
export class PluginWidget extends WidgetBase implements OnInit, OnDestroy {
  public config: PluginConfig<any> = null;

  private refreshWidgetTimer: any = null;
  private networkChangeSub: Subscription = null;

  constructor(
    public theme: GlobalThemeService,
    public appService: AppmanagerService,
    private widgetsService: WidgetsService,
    private walletNetworkService: WalletNetworkService
  ) {
    super();
  }

  ngOnInit() {
    this.notifyReadyToDisplay();
    return;
  }

  ngOnDestroy(): Promise<void> {
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
    await this.widgetsService.refreshWidgetPluginContentIfRightTime(this.widgetState);
    this.rearmWidgetContentRefreshTimer();
  }

  private rearmWidgetContentRefreshTimer() {
    setTimeout(() => {
      void this.checkRightTimeToRefreshWidgetContent();
    }, 30000);
  }

  public async attachWidgetState(widgetState: WidgetState) {
    super.attachWidgetState(widgetState);

    this.config = await WidgetPluginsService.instance.getPluginWidgetStateConfig(widgetState);

    this.networkChangeSub = this.walletNetworkService.activeNetwork.subscribe(activeNetwork => {
      if (activeNetwork) {
        if (this.config.refreshon && this.config.refreshon.includes(RefreshOn.NETWORK_CHANGE)) {
          // Widget asks to refresh content on network change, so we refresh.
          void this.widgetsService.refreshWidgetPluginContent(this.widgetState);
        }
      }
    });

    // If not created for selection (live mode), start the loop that will auto refresh the widget content
    if (!this.forSelection) {
      // Check right now
      void this.checkRightTimeToRefreshWidgetContent();
    }
  }
}
