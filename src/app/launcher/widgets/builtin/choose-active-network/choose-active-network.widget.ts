import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { AnyNetwork } from 'src/app/wallet/model/networks/network';
import { LastUsedNetworks, WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletNetworkUIService } from 'src/app/wallet/services/network.ui.service';
import { IWidget } from '../../base/iwidget';
import { WidgetState } from '../../base/widgetstate';

@Component({
  selector: 'choose-active-network',
  templateUrl: './choose-active-network.widget.html',
  styleUrls: ['./choose-active-network.widget.scss'],
})
export class ChooseActiveNetworkWidget implements IWidget, OnInit, OnDestroy {
  public forSelection: boolean; // Initialized by the widget service

  private activeNetworkSub: Subscription = null;
  private lastUsedNetworksSub: Subscription = null;

  public activeNetwork: AnyNetwork = null;
  public lastUsedNetworks: AnyNetwork[] = []; // The 4 last used networks

  constructor(
    public theme: GlobalThemeService,
    private walletNetworkService: WalletNetworkService,
    private walletNetworkUIService: WalletNetworkUIService
  ) { }

  ngOnInit() {
    this.activeNetworkSub = this.walletNetworkService.activeNetwork.subscribe(activeNetwork => {
      this.activeNetwork = activeNetwork;
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.lastUsedNetworksSub = this.walletNetworkService.lastUsedNetworks.subscribe(lastUsedNetworks => {
      this.prepareLastUsedNetworks(lastUsedNetworks);
    });
  }

  ngOnDestroy() {
    if (this.activeNetworkSub) {
      this.activeNetworkSub.unsubscribe();
      this.activeNetworkSub = null;
    }

    if (this.lastUsedNetworksSub) {
      this.lastUsedNetworksSub.unsubscribe();
      this.lastUsedNetworksSub = null;
    }
  }

  attachWidgetState(widgetState: WidgetState) {
  }

  /**
   * Based on last used networks list given by the networks service, recompute the display list
   * for the widget.
   */
  private prepareLastUsedNetworks(lastUsedNetworks: LastUsedNetworks) {
    // Use a defqult list of networks we want to show in the recently used networks list,
    // in case user hasn't used any network yet. Ze do this in order to not hqve qn empty list,
    // but always 4 entries.
    // By display priority order.
    const defaultNetworks: AnyNetwork[] = [
      this.walletNetworkService.getNetworkByKey("elastossmartchain"),
      this.walletNetworkService.getNetworkByKey("ethereum"),
      this.walletNetworkService.getNetworkByKey("btc"),
      this.walletNetworkService.getNetworkByKey("bsc")
    ].filter(n => !!n); // Filter undefined networks to make sure we are ready

    this.lastUsedNetworks = lastUsedNetworks.list.map(lun => lun.network).slice(0, 4); // Keep only the last 4 entries

    // Complete user's last used networks with default networks, if we don't have 4 yet.
    this.lastUsedNetworks = [...this.lastUsedNetworks, ...defaultNetworks.slice(0, 4 - this.lastUsedNetworks.length)];

    // Among the most recent 4 networks, sort networks alphabetically to avoid changing their positions on the
    // UI every time as this looks clunky
    this.lastUsedNetworks.sort((a, b) => {
      return a.name.localeCompare(b.key);
    });
  }

  public selectNetwork(network: AnyNetwork) {
    void this.walletNetworkService.setActiveNetwork(network);
  }

  public pickNetwork() {
    void this.walletNetworkUIService.chooseActiveNetwork();
  }

  public isNetworkActive(network: AnyNetwork) {
    return this.activeNetwork && network.key === this.activeNetwork.key;
  }
}
