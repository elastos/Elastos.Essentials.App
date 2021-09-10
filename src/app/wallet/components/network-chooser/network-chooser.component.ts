import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { CoinType } from '../../model/coin';
import { Network } from '../../model/networks/network';
import { CurrencyService } from '../../services/currency.service';
import { WalletNetworkService } from '../../services/network.service';
import { UiService } from '../../services/ui.service';

export type NetworkChooserComponentOptions = {
  currentNetwork: Network;
}

@Component({
  selector: 'app-network-chooser',
  templateUrl: './network-chooser.component.html',
  styleUrls: ['./network-chooser.component.scss'],
})
export class NetworkChooserComponent implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public CoinType = CoinType;
  public options: NetworkChooserComponentOptions = null;
  public currentNetwork: Network;
  public networksToShowInList: Network[];

  constructor(
    private navParams: NavParams,
    private networkService: WalletNetworkService,
    public uiService: UiService,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    public currencyService: CurrencyService,
    private modalCtrl: ModalController
  ) {
  }

  ngOnInit() {
    this.options = this.navParams.data as NetworkChooserComponentOptions;

    this.currentNetwork = this.options.currentNetwork;
    this.networksToShowInList = this.networkService.getAvailableNetworks();
  }

  selectNetwork(network: Network) {
    Logger.log("wallet", "Network selected", network);

    void this.modalCtrl.dismiss({
      selectedNetworkKey: network.key
    });
  }

  cancelOperation() {
    Logger.log("wallet", "Network selection cancelled");
    void this.modalCtrl.dismiss();
  }
}
