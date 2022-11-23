import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { GlobalWalletConnectService } from 'src/app/services/walletconnect/global.walletconnect.service';
import { WalletConnectInstance } from 'src/app/services/walletconnect/instances';
import { walletConnectStore } from 'src/app/services/walletconnect/store';
import { WidgetBase } from '../../base/widgetbase';
import { WidgetsServiceEvents } from '../../services/widgets.events';

@Component({
  selector: 'widget-wallet-connect',
  templateUrl: './wallet-connect.widget.html',
  styleUrls: ['./wallet-connect.widget.scss'],
})
export class WalletConnectWidget extends WidgetBase implements OnInit, OnDestroy {
  public editing: boolean; // Widgets container is being edited

  private walletConnectSub: Subscription = null; // Subscription to wallet connect active sessions
  public walletConnectInstances: WalletConnectInstance[] = [];

  constructor(
    private zone: NgZone,
    public theme: GlobalThemeService,
    public didService: DIDManagerService,
    private nav: GlobalNavService,
    private globalWalletConnectService: GlobalWalletConnectService
  ) {
    super();
  }

  ngOnInit() {
    // Watch edition mode change to show this widget in edition even if not showing in live mode.
    WidgetsServiceEvents.editionMode.subscribe(editing => {
      this.editing = editing;
    });

    this.walletConnectSub = walletConnectStore.wcInstances.subscribe(instances => {
      this.zone.run(() => {
        this.walletConnectInstances = Array.from(instances.values()).slice(0, 3); // Keep only 3 items
        Logger.log("launcher", "Displayed wallet connect instances:", this.walletConnectInstances, this.walletConnectInstances.length);

        this.notifyReadyToDisplay();
      });
    });
  }

  ngOnDestroy() {
    if (this.walletConnectSub) {
      this.walletConnectSub.unsubscribe();
      this.walletConnectSub = null;
    }
  }

  /**
   * Opens the wallet connect sessions screen in settings
   */
  public showWalletConnectSessions() {
    void this.nav.navigateTo("settings", "/settings/walletconnect/sessions");
  }

  public someWalletConnectSessionsCanBeDisplayed(): boolean {
    if (!this.walletConnectInstances || this.walletConnectInstances.length == 0)
      return false;
    else
      return true;
  }
}
