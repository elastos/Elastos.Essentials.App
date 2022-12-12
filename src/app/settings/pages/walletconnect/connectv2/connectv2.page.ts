import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { SignClientTypes } from '@walletconnect/types';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Util } from 'src/app/model/util';
import { SessionProposalEvent } from 'src/app/model/walletconnect/types';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { GlobalWalletConnectService } from 'src/app/services/walletconnect/global.walletconnect.service';
import { WalletConnectV2Service } from 'src/app/services/walletconnect/walletconnect.v2.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { DeveloperService } from '../../../services/developer.service';
import { SettingsService } from '../../../services/settings.service';

export type ConnectV2PageParams = {
  // TODO connectorKey: string,
  event: SessionProposalEvent
}

/* interface Event {
   id: number;
   params: {
     id: number;
     expiry: number;
     relays: { protocol: string; data?: string }[];
     proposer: {
       publicKey: string;
       metadata: {
         name: string;
         description: string;
         url: string;
         icons: string[];
       };
     };
     requiredNamespaces: Record<
       string,
       {
         chains: string[];
         methods: string[];
         events: string[];
         extension?: {
           chains: string[];
           methods: string[];
           events: string[];
         }[];
       }
     >;
     pairingTopic?: string;
   };
 } */
@Component({
  selector: 'app-connectv2',
  templateUrl: './connectv2.page.html',
  styleUrls: ['./connectv2.page.scss'],
})
export class WalletConnectConnectV2Page implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public sessionProposal: ConnectV2PageParams;

  public ethAccounts: string[] = [];
  public supportedEIP155Methods: string[] = [];
  public unsupportedEIP155Methods: string[] = [];
  public supportedChains: string[] = [];
  public unsupportedChains: string[] = [];

  private backSubscription: Subscription = null;
  private activeNetworkWalletSubscription: Subscription = null;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public settings: SettingsService,
    public theme: GlobalThemeService,
    public developer: DeveloperService,
    public translate: TranslateService,
    private route: ActivatedRoute,
    private router: Router,
    private walletConnect: GlobalWalletConnectService,
    private walletConnectV2: WalletConnectV2Service,
    private walletManager: WalletService,
    private nav: GlobalNavService,
    private platform: Platform,
    private native: GlobalNativeService
  ) { }

  async ngOnInit() {
    const navigation = this.router.getCurrentNavigation();
    if (!Util.isEmptyObject(navigation.extras.state)) {
      this.sessionProposal = <ConnectV2PageParams>navigation.extras.state;
      console.log("proposal params", this.sessionProposal)

      // Use only the active master wallet.
      this.ethAccounts = [];
      // Sometimes it is necessary to wait for the wallet to initialize.
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.activeNetworkWalletSubscription = this.walletManager.activeNetworkWallet.subscribe(async (activeWallet) => {
        if (activeWallet) {
          let subwallet = activeWallet.getMainEvmSubWallet();
          if (subwallet) // Can be null, if the active network is not EVM
            this.ethAccounts.push(await subwallet.getCurrentReceiverAddress());
        }
      })

      await this.initialize();
    }
  }

  ngOnDestroy() {
    if (this.activeNetworkWalletSubscription) {
      this.activeNetworkWalletSubscription.unsubscribe();
      this.activeNetworkWalletSubscription = null;
    }
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('settings.wallet-connect-request'));
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: null, iconPath: BuiltInIcon.CLOSE }); // Replace essentials logo with close icon
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = async (icon) => {
      // Close
      await this.walletConnectV2.rejectSession(this.sessionProposal.event.params, "User cancelled");
      void this.titleBar.globalNav.exitCurrentContext();
    });

    // Catch android back key to reject the session
    this.backSubscription = this.platform.backButton.subscribeWithPriority(0, async (processNext) => {
      await this.walletConnectV2.rejectSession(this.sessionProposal.event.params, "User cancelled");
      processNext();
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    if (this.backSubscription) {
      this.backSubscription.unsubscribe();
      this.backSubscription = null;
    }
  }

  private initialize() {
    const evaluatedChains = this.walletConnectV2.evaluateChains(this.sessionProposal.event.params);
    this.supportedChains = evaluatedChains.filter(m => m.isSupported).map(m => m.chain);
    this.unsupportedChains = evaluatedChains.filter(m => !m.isSupported).map(m => m.chain);

    const evaluatedMethods = this.walletConnectV2.evaluateMethods(this.sessionProposal.event.params);
    this.supportedEIP155Methods = evaluatedMethods.filter(m => m.isSupported).map(m => m.method);
    this.unsupportedEIP155Methods = evaluatedMethods.filter(m => !m.isSupported).map(m => m.method);
  }

  /**
   * Tells if we are able to open a session for this dapp, based on its required protocols, chains, methods.
   */
  public canOpenSession() {
    return this.unsupportedEIP155Methods.length === 0 && this.unsupportedChains.length === 0;
  }

  async openSession() {
    await this.walletConnectV2.acceptSessionRequest(this.sessionProposal.event.params, this.ethAccounts);
    await this.nav.exitCurrentContext();

    // Because for now we don't close Essentials after handling wallet connect requests, we simply
    // inform users to manually "alt tab" to return to the app they are coming from.
    this.native.genericToast("settings.wallet-connect-popup", 2000);
  }

  public getProposerMeta(): SignClientTypes.Metadata {
    return this.sessionProposal.event.params.proposer.metadata;
  }
}
