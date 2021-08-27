import { Component, ViewChild, NgZone, OnInit } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalPublicationService, DIDPublicationStatus } from 'src/app/services/global.publication.service';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { analyzeAndValidateNgModules } from '@angular/compiler';
import { Logger } from 'src/app/logger';
import { ModalController } from '@ionic/angular';
import { Network } from 'src/app/wallet/model/networks/network';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';

@Component({
  selector: 'app-switch-network-to-elastos',
  templateUrl: './switch-network-to-elastos.component.html',
  styleUrls: ['./switch-network-to-elastos.component.scss'],
})
export class SwitchNetworkToElastosComponent implements OnInit {
  public currentNetwork: Network = null;
  public elastosNetwork: Network = null;

  constructor(
    public theme: GlobalThemeService,
    private zone: NgZone,
    private modalCtrl: ModalController,
    private walletNetworkService: WalletNetworkService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.currentNetwork = this.walletNetworkService.activeNetwork.value;
    this.elastosNetwork = this.walletNetworkService.getNetworkByKey("elastos");
  }

  ionViewWillEnter() {
  }

  public switchNetwork() {
    void this.walletNetworkService.setActiveNetwork(this.elastosNetwork);
    void this.modalCtrl.dismiss(true);
  }
}
