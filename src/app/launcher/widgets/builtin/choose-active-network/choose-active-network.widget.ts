import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { AnyNetwork } from 'src/app/wallet/model/networks/network';
import { LastUsedNetworks, WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletNetworkUIService } from 'src/app/wallet/services/network.ui.service';
import { Widget } from '../../base/widget.interface';

@Component({
  selector: 'choose-active-network',
  templateUrl: './choose-active-network.widget.html',
  styleUrls: ['./choose-active-network.widget.scss'],
})
export class ChooseActiveNetworkWidget implements Widget, OnInit, OnDestroy {
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

  /**
   * Based on last used networks list given by the networks service, recompute the display list
   * for the widget.
   */
  private prepareLastUsedNetworks(lastUsedNetworks: LastUsedNetworks) {
    this.lastUsedNetworks = lastUsedNetworks.list.map(lun => lun.network).slice(0, 4); // Keep only the last 4 entries

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
