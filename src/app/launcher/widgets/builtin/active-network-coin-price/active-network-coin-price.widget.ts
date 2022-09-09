import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { Subscription } from 'rxjs';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { AnySubWallet } from 'src/app/wallet/model/networks/base/subwallets/subwallet';
import { AnyNetwork } from 'src/app/wallet/model/networks/network';
import { CurrencyService } from 'src/app/wallet/services/currency.service';
import { WalletInitService } from 'src/app/wallet/services/init.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletNetworkUIService } from 'src/app/wallet/services/network.ui.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';

@Component({
  selector: 'active-network-coin-price',
  templateUrl: './active-network-coin-price.widget.html',
  styleUrls: ['./active-network-coin-price.widget.scss'],
})
export class ActiveNetworkCoinPriceWidget implements OnInit, OnDestroy {
  private coinPriceRoot: ElementRef;
  @ViewChild('coinPriceRoot', { static: false }) set content(_coinPriceRoot: ElementRef) {
    this.coinPriceRoot = _coinPriceRoot;
    this.prepare();
  }

  public forSelection: boolean; // Initialized by the widget service

  private popover: HTMLIonPopoverElement = null;
  public activeNetwork: AnyNetwork = null;
  private activeStandardSubwallet: AnySubWallet = null;
  public coinDisplayPrice: string = null;

  private walletServiceSub: Subscription = null; // Subscription to wallet service initialize completion event
  private networkWalletSub: Subscription = null; // Subscription to wallet service to know when a wallet is created, deleted
  private activeNetworkSub: Subscription = null; // Subscription to wallet service to know when the active network (elastos, heco, bsc, etc) changes

  constructor(
    public theme: GlobalThemeService,
    private nav: GlobalNavService,
    private popoverCtrl: PopoverController,
    public walletService: WalletService,
    private walletNetworkUIService: WalletNetworkUIService,
    private walletInitService: WalletInitService,
    public walletNetworkService: WalletNetworkService,
    private globalNative: GlobalNativeService,
    public translate: TranslateService,
    public currencyService: CurrencyService
  ) { }

  ngOnInit(): Promise<void> {
    // Refresh when network changes
    this.activeNetworkSub = this.walletNetworkService.activeNetwork.subscribe(activeNetwork => {
      this.activeNetwork = activeNetwork;
      void this.prepare();
    });

    // Refresh when native coin prices are fetched
    this.currencyService.pricesFetchedSubject.subscribe(() => {
      void this.prepare();
    })

    void this.prepare();

    return;
  }

  ngOnDestroy(): Promise<void> {
    if (this.walletServiceSub) {
      this.walletServiceSub.unsubscribe();
      this.walletServiceSub = null;
    }
    if (this.networkWalletSub) {
      this.networkWalletSub.unsubscribe();
      this.networkWalletSub = null;
    }
    if (this.activeNetworkSub) {
      this.activeNetworkSub.unsubscribe();
      this.activeNetworkSub = null;
    }

    return;
  }

  private prepare() {
    if (this.activeNetwork) {
      let coinPrice = this.currencyService.getMainTokenValue(new BigNumber(1), this.activeNetwork, 'USD'); // TODO: Use user currency from wallet settings
      if (coinPrice && !coinPrice.isNaN()) {
        this.coinDisplayPrice = coinPrice.decimalPlaces(this.currencyService.selectedCurrency.decimalplace, BigNumber.ROUND_DOWN).toFixed();;
      }

      if (this.coinPriceRoot) {
        let networkColor = this.activeNetwork.getMainColor(); // RRGGBB
        let gradientColor = networkColor || "5D37C0"; // Default color, if none defined by network.
        let gradient = `linear-gradient(90deg, #${gradientColor}99 0%, #${gradientColor}33 100%)`;
        this.coinPriceRoot.nativeElement.style.background = gradient;
      }
    }
  }

  public getNetworkWithCoin() {
    if (!this.activeNetwork)
      return "";

    return `${this.activeNetwork.name} (${this.activeNetwork.getMainTokenSymbol()})`;
  }

  public pickNetwork() {
    void this.walletNetworkUIService.chooseActiveNetwork();
  }
}
