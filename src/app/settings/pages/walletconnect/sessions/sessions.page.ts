import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { ConnectorWithExtension, GlobalWalletConnectService } from 'src/app/services/global.walletconnect.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { DeveloperService } from '../../../services/developer.service';
import { SettingsService } from '../../../services/settings.service';

@Component({
  selector: 'app-sessions',
  templateUrl: './sessions.page.html',
  styleUrls: ['./sessions.page.scss'],
})
export class WalletConnectSessionsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public activeConnectors: ConnectorWithExtension[] = [];

  constructor(
    public settings: SettingsService,
    public theme: GlobalThemeService,
    public developer: DeveloperService,
    public translate: TranslateService,
    private walletConnect: GlobalWalletConnectService,
  ) { }

  ngOnInit() {
    this.walletConnect.walletConnectSessionsStatus.subscribe(status => {
      // Refresh sessions list after disconnection for example
      this.activeConnectors = this.walletConnect.getActiveConnectors();
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('settings.wallet-connect-sessions'));

    this.activeConnectors = this.walletConnect.getActiveConnectors();
    console.log("walletconnect sessions", this.activeConnectors)
  }

  ionViewWillLeave() {
  }

  getSessionName(connector: ConnectorWithExtension): string {
    if (connector.wc.peerMeta)
      return connector.wc.peerMeta.name;
    else
      return "Unknown session";
  }

  getSessionID(connector: ConnectorWithExtension): string {
    //return session.key.substr(0, 25)+"...";
    return connector.wc.key;
  }

  getSessionLogo(connector: ConnectorWithExtension): string {
    if (!connector || !connector.wc || !connector.wc.peerMeta || !connector.wc.peerMeta.icons || connector.wc.peerMeta.icons.length == 0)
      return 'assets/settings/icon/walletconnect.svg';

    return connector.wc.peerMeta.icons[0];
  }

  getSessionCreationDate(connector: ConnectorWithExtension): string {
    if (!connector.sessionExtension.timestamp)
      return null;

    return moment.unix(connector.sessionExtension.timestamp).startOf('minutes').fromNow();
  }

  async killSession(connector: ConnectorWithExtension) {
    try {
      await this.walletConnect.killSession(connector.wc);
    }
    catch (e) {
      console.warn("Kill session exception: ", e)
    }
  }
}
