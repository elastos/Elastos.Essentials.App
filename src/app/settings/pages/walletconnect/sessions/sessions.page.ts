import { Component, OnInit, ViewChild } from '@angular/core';
import { DeveloperService } from '../../../services/developer.service';
import { TranslateService } from '@ngx-translate/core';
import { SettingsService } from '../../../services/settings.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { App } from "src/app/model/app.enum"
import { GlobalWalletConnectService } from 'src/app/services/global.walletconnect.service';
import WalletConnect from '@walletconnect/client';

@Component({
  selector: 'app-sessions',
  templateUrl: './sessions.page.html',
  styleUrls: ['./sessions.page.scss'],
})
export class WalletConnectSessionsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public activeSessions: WalletConnect[] = [];

  constructor(
    public settings: SettingsService,
    public theme: GlobalThemeService,
    public developer: DeveloperService,
    public translate: TranslateService,
    private walletConnect: GlobalWalletConnectService,
  ) { }

  ngOnInit() {}

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('settings.wallet-connect-sessions'));

    this.activeSessions = this.walletConnect.getActiveSessions();
  }

  ionViewWillLeave() {
  }

  getSessionName(session: WalletConnect): string {
    if (session.peerMeta)
      return session.peerMeta.name;
    else
      return "Unknown session";
  }

  getSessionID(session: WalletConnect): string {
    return session.key.substr(0, 25)+"...";
  }

  async killSession(session: WalletConnect) {
    try {
      await this.walletConnect.killSession(session);
    }
    catch (e) {
      console.warn("Kill session exception: ", e)
    }

    // TODO! : subscribe to a "disconnected" event and refresh at that time
    setTimeout(() => {
      this.activeSessions = this.walletConnect.getActiveSessions();
    }, 2000);
  }
}
