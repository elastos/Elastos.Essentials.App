import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { CurrencyService } from '../../../services/currency.service';

@Component({
  selector: 'app-currency-select',
  templateUrl: './currency-select.page.html',
  styleUrls: ['./currency-select.page.scss'],
})
export class CurrencySelectPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  constructor(
    public currencyService: CurrencyService,
    public theme: GlobalThemeService,
    public translate: TranslateService,
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('wallet.select-currency-title'));
  }

}
