import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Util } from 'src/app/model/util';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNetworksService } from 'src/app/services/global.networks.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { CustomNetworkDiskEntry, WalletNetworkService } from 'src/app/wallet/services/network.service';

@Component({
  selector: 'app-edit-custom-network',
  templateUrl: './edit-custom-network.page.html',
  styleUrls: ['./edit-custom-network.page.scss'],
})
export class EditCustomNetworkPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  // Model
  public editedNetworkEntry: CustomNetworkDiskEntry = null;

  // Logic
  public editionMode = false;

  constructor(
    public theme: GlobalThemeService,
    public translate: TranslateService,
    public networkService: WalletNetworkService,
    private globalNetworksService: GlobalNetworksService,
    private router: Router,
    private globalNav: GlobalNavService,
    private zone: NgZone
  ) { }

  ngOnInit() {
    this.init();
  }

  private init() {
    const navigation = this.router.getCurrentNavigation();
    this.zone.run(() => {
      if (!Util.isEmptyObject(navigation.extras.state)) {
        if (navigation.extras.state.customNetworkKey) {
          this.editionMode = true;

          this.editedNetworkEntry = this.networkService.getCustomNetworkEntries().find(n => n.key === navigation.extras.state.customNetworkKey);
          return;
        }
      }

      this.editionMode = false;
      this.editedNetworkEntry = {
        key: "network-" + Date.now(),
        name: "",
        rpcUrl: "",
        chainId: "",
        networkTemplate: this.globalNetworksService.activeNetworkTemplate.value,
        mainCurrencySymbol: "",
        colorScheme: ''
      };
    });
  }

  ionViewWillEnter() {
    if (this.editionMode)
      this.titleBar.setTitle(this.translate.instant('wallet.add-custom-network-title'));
    else
      this.titleBar.setTitle(this.translate.instant('wallet.edit-custom-network-title'));
  }

  cancel() {
    void this.globalNav.navigateBack();
  }

  async delete(): Promise<void> {
    /* await this.networkService.deleteCustomNetwork(this.editedNetworkEntry);
    // TODO: select other network if that was the active one
    void this.globalNav.navigateBack(); */


    // TODO: wrong purple active effect on cancel button
    // TODO: light mode
    // TODO: test a RPC API call to validate the rpc url
    // TODO: do NOT do color scheme
    // TODO: i18n
    // TODO: footer effect bug
    // TODO: add "manage networks" button from net selection popup
  }

  public canSave(): boolean {
    return this.editedNetworkEntry.name !== "" && this.editedNetworkEntry.rpcUrl != "" && this.editedNetworkEntry.chainId !== "";
  }

  async saveChanges(): Promise<void> {
    await this.networkService.upsertCustomNetwork(this.editedNetworkEntry);
    void this.globalNav.navigateBack();
  }
}
