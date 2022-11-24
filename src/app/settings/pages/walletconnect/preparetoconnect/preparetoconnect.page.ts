import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { GlobalWalletConnectService, WalletConnectSessionRequestSource } from 'src/app/services/walletconnect/global.walletconnect.service';
import { WalletConnectV1Service } from 'src/app/services/walletconnect/walletconnect.v1.service';
import { WalletConnectV2Service } from 'src/app/services/walletconnect/walletconnect.v2.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { DeveloperService } from '../../../services/developer.service';
import { SettingsService } from '../../../services/settings.service';

@Component({
  selector: 'app-preparetoconnect',
  templateUrl: './preparetoconnect.page.html',
  styleUrls: ['./preparetoconnect.page.scss'],
})
export class WalletConnectPrepareToConnectPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public suggestToResetSession = false;
  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;
  private watchdogTimer: any; // Timeout by setTimeout()
  private wcVersion: number = null;

  constructor(
    private zone: NgZone,
    public settings: SettingsService,
    public theme: GlobalThemeService,
    public developer: DeveloperService,
    public translate: TranslateService,
    private route: ActivatedRoute,
    private router: Router,
    private walletConnect: GlobalWalletConnectService,
    private walletConnectV1: WalletConnectV1Service,
    private walletConnectV2: WalletConnectV2Service,
    private globalNav: GlobalNavService,
    private walletManager: WalletService,
    private nav: GlobalNavService,
    private platform: Platform
  ) { }

  ngOnInit() {
    if (this.router.getCurrentNavigation().extras) {
      this.wcVersion = <number>this.router.getCurrentNavigation().extras.state.version;
    }
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('settings.wallet-connect-prepare-to-connect'));
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: null, iconPath: BuiltInIcon.CLOSE }); // Replace ela logo with close icon
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      // Close
      void this.rejectSession("Cancelled by user");
      void this.titleBar.globalNav.exitCurrentContext();
    });

    // Suggest user to delete a potential wallet connect session after a while in case he doesn't
    // receive any "session_request" event.
    this.suggestToResetSession = false;
    this.watchdogTimer = setTimeout(() => {
      this.zone.run(() => {
        this.suggestToResetSession = true;
      });
    }, 10000);
  }

  ionViewDidEnter() {
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    // Important: stop the watchdog timer to not get sessions killed after a successful connection
    clearTimeout(this.watchdogTimer);
  }

  public comingFromScanner(): boolean {
    return this.walletConnect.getRequestSource() == WalletConnectSessionRequestSource.SCANNER;
  }

  public getActionButtonTitle(): string {
    if (this.comingFromScanner())
      return this.translate.instant('settings.scan-again');
    else
      return this.translate.instant('common.cancel');
  }

  public async retryOrCancel() {
    if (this.comingFromScanner()) {
      // Coming from a scan: reject current request, kill all sessions and let user scan again
      await this.rejectSession("Scanning again");
      await void this.walletConnect.killAllSessions();
      await this.globalNav.navigateTo("scanner", '/scanner/scan');
    }
    else {
      // Coming from an intent: cancel current request and go back.
      await this.rejectSession("Scanning again");
      void this.nav.navigateBack();
    }
  }

  private async rejectSession(reason: string) {
    if (this.wcVersion === 1)
      await this.walletConnectV1.rejectSession(null, reason);
    else
      await this.walletConnectV2.rejectSession(null, reason);
  }

  viewSessions() {
    void this.nav.navigateTo("walletconnectsession", "/settings/walletconnect/sessions");
  }
}
