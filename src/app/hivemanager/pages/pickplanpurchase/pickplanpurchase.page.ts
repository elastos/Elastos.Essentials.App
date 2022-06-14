import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PricingPlan } from '@elastosfoundation/hive-js-sdk';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { App } from "src/app/model/app.enum";
import { GlobalHiveService } from 'src/app/services/global.hive.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { HiveService } from '../../services/hive.service';

@Component({
  selector: 'app-pickplanpurchase',
  templateUrl: './pickplanpurchase.page.html',
  styleUrls: ['./pickplanpurchase.page.scss'],
})
export class PickPlanPurchasePage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;
  public planToPurchase: PricingPlan = null;

  constructor(
    public zone: NgZone,
    private hiveService: HiveService,
    private route: ActivatedRoute,
    public theme: GlobalThemeService,
    private globalNav: GlobalNavService,
    private translate: TranslateService,
    private globalHiveService: GlobalHiveService
  ) { }

  ngOnInit() {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.route.queryParams.subscribe(async (params: { planName: string }) => {
      let subscriptionService = await this.globalHiveService.getActiveUserSubscriptionServices();
      this.planToPurchase = void subscriptionService.getPricingPlan(params.planName);
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('hivemanager.pickplanpurchase.title'));
  }

  public async purchasePlan() {
    await this.hiveService.purchasePlan(this.planToPurchase);

    void this.globalNav.navigateTo(App.HIVE_MANAGER, "/hivemanager/pickprovider");
  }
}
