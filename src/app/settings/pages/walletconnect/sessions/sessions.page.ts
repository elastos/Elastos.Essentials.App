import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import type WalletConnect from '@walletconnect/client';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalWalletConnectService } from 'src/app/services/global.walletconnect.service';
import { DeveloperService } from '../../../services/developer.service';
import { SettingsService } from '../../../services/settings.service';

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

  ngOnInit() {
    this.walletConnect.walletConnectSessionsStatus.subscribe(status => {
      // Refresh sessions list after disconnection for example
      this.activeSessions = this.walletConnect.getActiveSessions();
    });
  }

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
    //return session.key.substr(0, 25)+"...";
    return session.key;
  }

  getSessionLogo(session: WalletConnect): string {
    if (!session || !session.peerMeta || !session.peerMeta.icons || session.peerMeta.icons.length == 0)
      return 'assets/settings/icon/walletconnect.svg';

    return session.peerMeta.icons[0];
  }

  async killSession(session: WalletConnect) {
    try {
      await this.walletConnect.killSession(session);
    }
    catch (e) {
      console.warn("Kill session exception: ", e)
    }
  }
}
