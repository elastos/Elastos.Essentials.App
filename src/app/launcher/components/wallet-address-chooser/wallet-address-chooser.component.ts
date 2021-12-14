import { Component, OnInit } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { reducedWalletAddress } from 'src/app/helpers/wallet.helper';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { WalletAddressInfo } from 'src/app/wallet/model/wallets/networkwallet';
import { GlobalThemeService } from '../../../services/global.theme.service';

export type WalletAddressChooseComponentOptions = {
  addresses: WalletAddressInfo[]
}

@Component({
  selector: 'app-wallet-address-chooser',
  templateUrl: './wallet-address-chooser.component.html',
  styleUrls: ['./wallet-address-chooser.component.scss'],
})
export class WalletAddressChooserComponent implements OnInit {
  public walletAddressesInfo: WalletAddressInfo[] = [];

  constructor(
    public theme: GlobalThemeService,
    private popoverCtrl: PopoverController,
    private navParams: NavParams,
    private translate: TranslateService,
    private globalNative: GlobalNativeService
  ) { }

  ngOnInit(): void {
    let options = this.navParams.data as any as WalletAddressChooseComponentOptions;;
    this.walletAddressesInfo = options.addresses;
  }

  public getReducedWalletAddress(address: string) {
    return reducedWalletAddress(address);
  }

  public copyAddress(addressInfo: WalletAddressInfo) {
    let address = addressInfo.address;
    let confirmationMessage = this.translate.instant('launcher.address-copied-to-clipboard', { address });
    this.globalNative.genericToast(confirmationMessage);
    void this.globalNative.copyClipboard(address);

    void this.popoverCtrl.dismiss();
  }
}
