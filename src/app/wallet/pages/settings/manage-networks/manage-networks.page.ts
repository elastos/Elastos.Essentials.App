import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import {
  BuiltInIcon,
  TitleBarIcon,
  TitleBarIconSlot,
  TitleBarMenuItem
} from 'src/app/components/titlebar/titlebar.types';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { AnyNetwork } from 'src/app/wallet/model/networks/network';
import { CustomNetworkDiskEntry, CustomNetworkService } from 'src/app/wallet/services/evm/customnetwork.service';
import { Native } from 'src/app/wallet/services/native.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { EditBuiltinNetworkRoutingParams } from '../edit-builtin-network/edit-builtin-network.page';
import { EditCustomNetworkRoutingParams } from '../edit-custom-network/edit-custom-network.page';

type ManageableNetworkEntry = {
  network: AnyNetwork;
  isShown: boolean; // Whether this network appears in the network chooser or not.
  isCustom: boolean;
  customNetworkEntry?: CustomNetworkDiskEntry;
};

@Component({
  selector: 'app-manage-networks',
  templateUrl: './manage-networks.page.html',
  styleUrls: ['./manage-networks.page.scss']
})
export class ManageNetworksPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public availableNetworks: ManageableNetworkEntry[] = [];
  public builtinNetworks: ManageableNetworkEntry[] = [];
  public customNetworks: ManageableNetworkEntry[] = [];
  public customNetworkEntries: CustomNetworkDiskEntry[] = [];
  public activeTab: 'builtin' | 'custom' = 'builtin';

  // Events
  private netListSubscription: Subscription = null;

  // Titlebar
  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public theme: GlobalThemeService,
    public translate: TranslateService,
    public networkService: WalletNetworkService,
    private customNetworksService: CustomNetworkService,
    private native: Native
  ) {}

  ngOnInit() {
    this.netListSubscription = this.networkService.networksList.subscribe(_ => {
      this.customNetworkEntries = this.customNetworksService.getCustomNetworkEntries();

      let networks = this.networkService.getAvailableNetworks();

      // Build the list of editable networks
      this.availableNetworks = networks.map(n => {
        let customNetworkEntry = this.customNetworkEntries.find(cn => cn.key === n.key);

        return {
          network: n,
          isShown: this.networkService.getNetworkVisible(n.key),
          isCustom: !!customNetworkEntry,
          customNetworkEntry
        };
      });

      // Separate networks into built-in and custom
      this.builtinNetworks = this.availableNetworks.filter(n => !n.isCustom);
      this.customNetworks = this.availableNetworks.filter(n => n.isCustom);
    });

    this.titleBar.addOnItemClickedListener(
      (this.titleBarIconClickedListener = (menuIcon: TitleBarIcon) => {
        if (menuIcon.key == 'add-custom-network') this.addCustomNetwork();
      })
    );
  }

  private unsubscribe(subscription: Subscription) {
    if (subscription) {
      subscription.unsubscribe();
    }
  }

  ngOnDestroy() {
    this.unsubscribe(this.netListSubscription);
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('wallet.manage-networks-title'));
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
      key: 'add-custom-network',
      iconPath: BuiltInIcon.ADD
    });
  }

  ionViewWillLeave() {
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, null);
  }

  public switchTab(tab: 'builtin' | 'custom') {
    this.activeTab = tab;
  }

  public addCustomNetwork() {
    let params: EditCustomNetworkRoutingParams = {
      forEdition: false,
      intentMode: false
    };
    this.native.go('/wallet/settings/edit-custom-network', params);
  }

  public onNetworkClicked(networkEntry: ManageableNetworkEntry) {
    // Only custom networks can be clicked (built-in networks are handled separately)
    if (networkEntry.isCustom) {
      this.editCustomNetwork(networkEntry.customNetworkEntry);
    }
  }

  private editCustomNetwork(networkEntry: CustomNetworkDiskEntry) {
    let params: EditCustomNetworkRoutingParams = {
      forEdition: true,
      intentMode: false,
      customNetworkKey: networkEntry.key
    };
    this.native.go('/wallet/settings/edit-custom-network', params);
  }

  private editBuiltinNetwork(network: AnyNetwork) {
    let params: EditBuiltinNetworkRoutingParams = {
      networkKey: network.key
    };
    this.native.go('/wallet/settings/edit-builtin-network', params);
  }
}
