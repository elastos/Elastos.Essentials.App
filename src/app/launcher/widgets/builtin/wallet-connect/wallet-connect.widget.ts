import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import WalletConnect from '@walletconnect/client';
import { Subscription } from 'rxjs';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalWalletConnectService } from 'src/app/services/global.walletconnect.service';
import { Widget } from '../../base/widget.interface';
import { WidgetsService } from '../../services/widgets.service';

@Component({
  selector: 'widget-wallet-connect',
  templateUrl: './wallet-connect.widget.html',
  styleUrls: ['./wallet-connect.widget.scss'],
})
export class WalletConnectWidget implements Widget, OnInit, OnDestroy {
  public forSelection: boolean; // Initialized by the widget service
  public editing: boolean; // Widgets container is being edited

  private walletConnectSub: Subscription = null; // Subscription to wallet connect active sessions
  public walletConnectConnectors: WalletConnect[] = [];

  constructor(
    private zone: NgZone,
    public theme: GlobalThemeService,
    public didService: DIDManagerService,
    private nav: GlobalNavService,
    private globalWalletConnectService: GlobalWalletConnectService
  ) { }

  ngOnInit() {
    // Watch edition mode change to show this widget in edition even if not showing in live mode.
    WidgetsService.instance.editionMode.subscribe(editing => {
      this.editing = editing;
    });

    this.walletConnectSub = this.globalWalletConnectService.walletConnectSessionsStatus.subscribe(connectors => {
      this.zone.run(() => {
        this.walletConnectConnectors = Array.from(connectors.values());
        Logger.log("launcher", "Wallet connect connectors:", this.walletConnectConnectors, this.walletConnectConnectors.length);
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
    if (!this.walletConnectConnectors || this.walletConnectConnectors.length == 0)
      return false;

    // Make sure the connectors are displayable, i.e. they have some peer metadata set
    return this.walletConnectConnectors.filter(c => {
      return c.peerMeta && c.peerMeta.icons && c.peerMeta.icons.length > 0;
    }).length > 0;
  }

}
