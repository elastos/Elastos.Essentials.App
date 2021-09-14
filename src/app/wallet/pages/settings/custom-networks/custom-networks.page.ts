import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Native } from 'src/app/wallet/services/native.service';
import { CustomNetworkDiskEntry, WalletNetworkService } from 'src/app/wallet/services/network.service';

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
    private native: Native
  ) { }

  ngOnInit() {
    this.networkService.networksList.subscribe(_ => {
      // Refresh custom network entr
      this.customNetworkEntries = this.networkService.getCustomNetworkEntries();
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('wallet.custom-networks-title'));
  }

  public addCustomNetwork() {
    this.native.go("/wallet/settings/edit-custom-network");
  }

  public editCustomNetwork(networkEntry: CustomNetworkDiskEntry) {
    this.native.go("/wallet/settings/edit-custom-network", {
      customNetworkKey: networkEntry.key
    });
  }
}
