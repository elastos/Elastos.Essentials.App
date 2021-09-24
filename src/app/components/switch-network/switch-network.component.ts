import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Network } from 'src/app/wallet/model/networks/network';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';

type SwitchNetworkComponentOptions = {
  networkKey: string;
}

@Component({
  selector: 'app-switch-network',
  templateUrl: './switch-network.component.html',
  styleUrls: ['./switch-network.component.scss'],
})
export class SwitchNetworkComponent implements OnInit {
  public currentNetwork: Network = null;
  public targetNetwork: Network = null;

  public options: SwitchNetworkComponentOptions = null;

  constructor(
    private navParams: NavParams,
    public theme: GlobalThemeService,
    private modalCtrl: ModalController,
    private walletNetworkService: WalletNetworkService
  ) { }

  ngOnInit(): void {
    this.options = this.navParams.data as SwitchNetworkComponentOptions;

    this.currentNetwork = this.walletNetworkService.activeNetwork.value;
    this.targetNetwork = this.walletNetworkService.getNetworkByKey(this.options.networkKey);
  }

  ionViewWillEnter() {
  }

  public switchNetwork() {
    void this.walletNetworkService.setActiveNetwork(this.targetNetwork);
    void this.modalCtrl.dismiss(true);
  }
}
