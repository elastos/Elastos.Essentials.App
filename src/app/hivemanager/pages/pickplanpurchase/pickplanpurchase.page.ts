import { Component, OnInit, ViewChild } from '@angular/core';
import { NgZone } from '@angular/core';
import { HiveService } from '../../services/hive.service';
import { ActivatedRoute } from '@angular/router';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { App } from "src/app/model/app.enum"

@Component({
  selector: 'app-pickplanpurchase',
  templateUrl: './pickplanpurchase.page.html',
  styleUrls: ['./pickplanpurchase.page.scss'],
})
export class PickPlanPurchasePage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;
  public planToPurchase: HivePlugin.Payment.PricingPlan = null;

  constructor(
    public zone: NgZone,
    private hiveService: HiveService,
    private route: ActivatedRoute,
    public theme: GlobalThemeService,
    private globalNav: GlobalNavService,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(async (params: { planName: string}) => {
      this.planToPurchase = await this.hiveService.getActiveVault().getPayment().getPricingPlan(params.planName);
    });
  }

  async ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('hivemanager.pickplanpurchase.title'));
  }

  public async purchasePlan() {
    let pricingInfo = await this.hiveService.getPricingInfo();
    await this.hiveService.purchasePlan(pricingInfo.getPaymentSettings(), this.planToPurchase);

    this.globalNav.navigateTo(App.HIVE_MANAGER, "/hivemanager/pickprovider");
  }
}
