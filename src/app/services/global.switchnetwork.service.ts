import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { SwitchNetworkToElastosComponent } from '../components/switch-network-to-elastos/switch-network-to-elastos.component';
import { WalletNetworkService } from '../wallet/services/network.service';
import { GlobalThemeService } from './global.theme.service';

@Injectable({
  providedIn: 'root'
})
export class GlobalSwitchNetworkService {
  constructor(
    private walletNetworkService: WalletNetworkService,
    private modalCtrl: ModalController,
    private theme: GlobalThemeService) {
  }

  public async switchNetworkToElastos(): Promise<boolean> {

    // Make sure the active network is elastos, otherwise, ask user to change
    if (!this.walletNetworkService.isActiveNetworkElastos()) {
        let networkHasBeenSwitched = await this.promptSwitchToElastosNetwork();
        if (!networkHasBeenSwitched)
            return false; // User has denied to switch network.
    }
    return true;
  }


  private promptSwitchToElastosNetwork(): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
    return new Promise(async resolve => {
        const modal = await this.modalCtrl.create({
            component: SwitchNetworkToElastosComponent,
            componentProps: {},
            backdropDismiss: true, // Closeable
            cssClass: !this.theme.darkMode ? "switch-network-component switch-network-component-base" : 'switch-network-component-dark switch-network-component-base'
        });

        void modal.onDidDismiss().then((response: { data?: boolean }) => {
            resolve(!!response.data); // true or undefined
        });

        void modal.present();
    });
  }
}
