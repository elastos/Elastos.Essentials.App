import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { GlobalWalletConnectService } from 'src/app/services/walletconnect/global.walletconnect.service';
import { WalletConnectInstance } from 'src/app/services/walletconnect/instances';
import { walletConnectStore } from 'src/app/services/walletconnect/store';
import { DeveloperService } from '../../../services/developer.service';
import { SettingsService } from '../../../services/settings.service';

@Component({
  selector: 'app-sessions',
  templateUrl: './sessions.page.html',
  styleUrls: ['./sessions.page.scss'],
})
export class WalletConnectSessionsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public activeInstances: WalletConnectInstance[] = [];

  constructor(
    public settings: SettingsService,
    public theme: GlobalThemeService,
    public developer: DeveloperService,
    public translate: TranslateService,
    private walletConnect: GlobalWalletConnectService,
  ) { }

  ngOnInit() {
    walletConnectStore.wcInstances.subscribe(status => {
      // Refresh sessions list after disconnection for example
      this.activeInstances = this.walletConnect.getActiveInstances();
      console.log("walletconnect sessions 2", this.activeInstances)
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('settings.wallet-connect-sessions'));

    this.activeInstances = this.walletConnect.getActiveInstances();
    console.log("walletconnect sessions", this.activeInstances)
  }

  ionViewWillLeave() {
  }

  getSessionName(instance: WalletConnectInstance): string {
    return instance.getName();
  }

  getSessionID(instance: WalletConnectInstance): string {
    return instance.id;
  }

  getSessionLogo(instance: WalletConnectInstance): string {
    return instance.getLogo();
  }

  getSessionDescription(instance: WalletConnectInstance): string {
    return instance.getDescription();
  }

  getSessionUrl(instance: WalletConnectInstance): string {
    return instance.getUrl();
  }

  getSessionCreationDate(instance: WalletConnectInstance): string {
    if (!instance.sessionExtension.timestamp)
      return null;

    return moment.unix(instance.sessionExtension.timestamp).startOf('minutes').fromNow();
  }

  async killSession(connector: WalletConnectInstance) {
    try {
      await this.walletConnect.killSession(connector);
    }
    catch (e) {
      console.warn("Kill session exception: ", e)
    }
  }
}
