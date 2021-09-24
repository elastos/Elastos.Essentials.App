import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { CustomNetworkService } from 'src/app/wallet/services/customnetwork.service';
import { Native } from 'src/app/wallet/services/native.service';
import { CustomNetworkDiskEntry, WalletNetworkService } from 'src/app/wallet/services/network.service';
import { EditCustomNetworkRoutingParams } from '../edit-custom-network/edit-custom-network.page';

@Component({
  selector: 'app-custom-networks',
  templateUrl: './custom-networks.page.html',
  styleUrls: ['./custom-networks.page.scss'],
})
export class CustomNetworksPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public customNetworkEntries: CustomNetworkDiskEntry[] = [];

  constructor(
    public theme: GlobalThemeService,
    public translate: TranslateService,
    public networkService: WalletNetworkService,
    private customNetworksService: CustomNetworkService,
    private native: Native
  ) { }

  ngOnInit() {
    this.networkService.networksList.subscribe(_ => {
      // Refresh custom network entr
      this.customNetworkEntries = this.customNetworksService.getCustomNetworkEntries();
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('wallet.custom-networks-title'));
  }

  public addCustomNetwork() {
    let params: EditCustomNetworkRoutingParams = {
      forEdition: false,
      intentMode: false
    };
    this.native.go("/wallet/settings/edit-custom-network", params);
  }

  public editCustomNetwork(networkEntry: CustomNetworkDiskEntry) {
    let params: EditCustomNetworkRoutingParams = {
      forEdition: true,
      intentMode: false,
      customNetworkKey: networkEntry.key
    };
    this.native.go("/wallet/settings/edit-custom-network", params);
  }
}
