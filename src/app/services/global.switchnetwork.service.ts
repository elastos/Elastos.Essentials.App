import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { SwitchNetworkComponent } from '../components/switch-network/switch-network.component';
import { AnyNetwork } from '../wallet/model/networks/network';
import { WalletNetworkService } from '../wallet/services/network.service';
import { GlobalThemeService } from './theming/global.theme.service';

@Injectable({
  providedIn: 'root'
})
export class GlobalSwitchNetworkService {
  public static instance: GlobalSwitchNetworkService = null;

  constructor(
    private walletNetworkService: WalletNetworkService,
    private modalCtrl: ModalController,
    private theme: GlobalThemeService) {
    GlobalSwitchNetworkService.instance = this;
  }

  /**
   * Asks user to switch to the elastos network, if this is not the currently active network.
   */
  public async promptSwitchToElastosNetworkIfDifferent(): Promise<boolean> {
    // Make sure the active network is elastos, otherwise, ask user to change
    if (!this.walletNetworkService.isActiveNetworkElastosMainchain()) {
      let networkHasBeenSwitched = await this.promptSwitchToElastosNetwork();
      if (!networkHasBeenSwitched)
        return false; // User has denied to switch network.
    }
    return true;
  }

  /**
   * Asks user to switch to a different network.
   */
  public promptSwitchToNetwork(network: AnyNetwork): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
    return new Promise(async resolve => {
      const modal = await this.modalCtrl.create({
        component: SwitchNetworkComponent,
        componentProps: {
          networkKey: network.key
        },
        backdropDismiss: true, // Closeable
        cssClass: !this.theme.darkMode ? "switch-network-component switch-network-component-base" : 'switch-network-component-dark switch-network-component-base'
      });

      void modal.onDidDismiss().then((response: { data?: boolean }) => {
        resolve(!!response.data); // true or undefined
      });

      void modal.present();
    });
  }

  /**
   * Asks user to switch to the elastos network.
   */
  public promptSwitchToElastosNetwork(): Promise<boolean> {
    return this.promptSwitchToNetwork(this.walletNetworkService.getNetworkByKey("elastos"));
  }
}
