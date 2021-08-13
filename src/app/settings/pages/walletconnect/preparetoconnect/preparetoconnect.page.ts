import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { DeveloperService } from '../../../services/developer.service';
import { TranslateService } from '@ngx-translate/core';
import { SettingsService } from '../../../services/settings.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { App } from "src/app/model/app.enum"
import { ActivatedRoute } from '@angular/router';
import { Logger } from 'src/app/logger';
import { SessionRequestParams } from 'src/app/model/walletconnect/types';
import { GlobalWalletConnectService, WalletConnectSessionRequestSource } from 'src/app/services/global.walletconnect.service';
import { WalletManager } from 'src/app/wallet/services/wallet.service';
import { Coin, StandardCoinName } from 'src/app/wallet/model/Coin';
import { ETHChainSubWallet } from 'src/app/wallet/model/wallets/ETHChainSubWallet';
import { TitleBarNavigationMode, TitleBarIconSlot, BuiltInIcon, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Platform } from '@ionic/angular';

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

  constructor(
    private zone: NgZone,
    public settings: SettingsService,
    public theme: GlobalThemeService,
    public developer: DeveloperService,
    public translate: TranslateService,
    private route: ActivatedRoute,
    private walletConnect: GlobalWalletConnectService,
    private globalNav: GlobalNavService,
    private walletManager: WalletManager,
    private nav: GlobalNavService,
    private platform: Platform
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('settings.wallet-connect-prepare-to-connect'));
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: null, iconPath: BuiltInIcon.CLOSE }); // Replace ela logo with close icon
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      // Close
      void this.walletConnect.rejectSession(null, "Cancelled by user");
      void this.titleBar.globalNav.exitCurrentContext();
    });

    // Suggest user to delete a potential wallet connect session after a while in case he doesn't
    // receive any "session_request" event.
    this.suggestToResetSession = false;
    this.watchdogTimer = setTimeout(() => {
      this.zone.run(()=>{
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
      await this.walletConnect.rejectSession(null, "Scanning again");
      await void this.walletConnect.killAllSessions();
      await this.globalNav.navigateTo("scanner", '/scanner/scan');
    }
    else {
      // Coming from an intent: cancel current request and go back.
      await this.walletConnect.rejectSession(null, "Scanning again");
      void this.nav.navigateBack();
    }
  }

  viewSessions() {
    void this.nav.navigateTo("walletconnectsession", "/settings/walletconnect/sessions");
  }
}
