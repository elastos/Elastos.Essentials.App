import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { Subscription } from 'rxjs';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { AnyNetwork } from 'src/app/wallet/model/networks/network';
import { CurrencyService } from 'src/app/wallet/services/currency.service';
import { WalletInitService } from 'src/app/wallet/services/init.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletNetworkUIService } from 'src/app/wallet/services/network.ui.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { WidgetBase } from '../../base/widgetbase';

@Component({
  selector: 'active-network-coin-price',
  templateUrl: './active-network-coin-price.widget.html',
  styleUrls: ['./active-network-coin-price.widget.scss'],
})
export class ActiveNetworkCoinPriceWidget extends WidgetBase implements OnInit, OnDestroy {
  private coinPriceRoot: ElementRef;
  @ViewChild('coinPriceRoot', { static: false }) set content(_coinPriceRoot: ElementRef) {
    this.coinPriceRoot = _coinPriceRoot;
  }

  public activeNetwork: AnyNetwork = null;
  public coinDisplayPrice: string = null;

  private activeNetworkSub: Subscription = null; // Subscription to wallet service to know when the active network (elastos, heco, bsc, etc) changes
  private pricesFetchedSub: Subscription = null; // Subscription to currency service to know when the price is fetched
  private currencyChangedSub: Subscription = null; // Subscription to currency service to know when the currency changes

  constructor(
    public theme: GlobalThemeService,
    public walletService: WalletService,
    private walletNetworkUIService: WalletNetworkUIService,
    public walletNetworkService: WalletNetworkService,
    private walletInitService: WalletInitService,
    public translate: TranslateService,
    public currencyService: CurrencyService
  ) {
    super();
  }

  ngOnInit(): Promise<void> {
    // Refresh when network changes
    this.activeNetworkSub = this.walletNetworkService.activeNetwork.subscribe(activeNetwork => {
      this.activeNetwork = activeNetwork;
      void this.prepare();
    });

    // Refresh when native coin prices are fetched
    this.pricesFetchedSub = this.currencyService.pricesFetchedSubject.subscribe(() => {
      void this.prepare();
    })

    // Refresh when the currency is changed
    this.currencyChangedSub = this.currencyService.currencyChangedSubject.subscribe(() => {
      void this.prepare();
    })

    return;
  }

  ngOnDestroy(): Promise<void> {
    if (this.activeNetworkSub) {
      this.activeNetworkSub.unsubscribe();
      this.activeNetworkSub = null;
    }
    if (this.pricesFetchedSub) {
      this.pricesFetchedSub.unsubscribe();
      this.pricesFetchedSub = null;
    }
    if (this.currencyChangedSub) {
      this.currencyChangedSub.unsubscribe();
      this.currencyChangedSub = null;
    }
    return;
  }

  private prepare() {
    if (this.activeNetwork) {
      let coinPrice = this.currencyService.getMainTokenValue(new BigNumber(1), this.activeNetwork, 'USD'); // TODO: Use user currency from wallet settings
      if (coinPrice && !coinPrice.isNaN()) {
        this.coinDisplayPrice = this.currencyService.usdToCurrencyAmount(coinPrice).decimalPlaces(this.currencyService.selectedCurrency.decimalplace, BigNumber.ROUND_DOWN).toFixed() + ' ' + this.currencyService.selectedCurrency.symbol;
      } else {
        this.coinDisplayPrice = '--'
      }

      if (this.coinPriceRoot) {
        let networkColor = this.activeNetwork.getMainColor(); // RRGGBB
        let gradientColor = networkColor || "5D37C0"; // Default color, if none defined by network.
        //let gradient = `linear-gradient(90deg, #${gradientColor}99 0%, #${gradientColor}33 100%)`;
        let gradient = `linear-gradient(90deg, #${gradientColor}BB 0%, #${gradientColor}00 80%)`;
        // TODO TRY: color/1 to color more dark/1
        this.coinPriceRoot.nativeElement.style.background = gradient;

        this.notifyReadyToDisplay();
      }
    }
  }

  public getNetworkWithCoin() {
    if (!this.activeNetwork)
      return "";

    return `${this.activeNetwork.getMainTokenSymbol()}`;
  }

  public pickNetwork() {
    void this.walletNetworkUIService.chooseActiveNetwork();
  }

  public openWallet() {
    this.walletInitService.start()
  }
}
