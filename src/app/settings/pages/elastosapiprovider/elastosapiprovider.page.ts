import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { SettingsService } from '../../services/settings.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalLanguageService } from 'src/app/services/global.language.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { ElastosAPIProvider, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';



/**
 * Provides a way to select which provider of API to use for all Elastos-related API calls such as
 * getting ethsc balances, EID endpoints, listing CR proposals, etc.
 */
@Component({
  selector: 'app-elastosapiprovider',
  templateUrl: './elastosapiprovider.page.html',
  styleUrls: ['./elastosapiprovider.page.scss'],
})
export class ElastosAPIProviderPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public apiProviders: ElastosAPIProvider[] = [];

  constructor(
    public settings: SettingsService,
    public languageService: GlobalLanguageService,
    public theme: GlobalThemeService,
    public translate: TranslateService,
    public globalElastosApiService: GlobalElastosAPIService
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('settings.elastosapiprovider'));

    this.apiProviders = this.globalElastosApiService.getAvailableProviders();
  }

  public useProvider(provider: ElastosAPIProvider) {
    void this.globalElastosApiService.useProvider(provider);
  }
}
