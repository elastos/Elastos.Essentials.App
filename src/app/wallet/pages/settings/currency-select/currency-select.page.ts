import { Component, OnInit } from '@angular/core';
import { CurrencyService } from '../../../services/currency.service';
import { TranslateService } from '@ngx-translate/core';
import { AppService } from '../../../services/app.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'app-currency-select',
  templateUrl: './currency-select.page.html',
  styleUrls: ['./currency-select.page.scss'],
})
export class CurrencySelectPage implements OnInit {

  constructor(
    public currencyService: CurrencyService,
    public theme: GlobalThemeService,
    public translate: TranslateService,
    private appService: AppService
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.appService.setTitleBarTitle(this.translate.instant('select-currency-title'));
  }

}
