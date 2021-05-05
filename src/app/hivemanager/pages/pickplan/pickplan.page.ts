import { Component, OnInit, ViewChild } from '@angular/core';
import { NgZone} from '@angular/core';
import { HiveService } from '../../services/hive.service';
import { ActivatedRoute } from '@angular/router';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { App } from "src/app/model/app.enum"

@Component({
  selector: 'app-pickplan',
  templateUrl: './pickplan.page.html',
  styleUrls: ['./pickplan.page.scss'],
})
export class PickPlanPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public fetchingPlans = true;
  public pricingInfo: HivePlugin.Payment.PricingInfo = null;

  constructor(
    public zone: NgZone,
    private hiveService: HiveService,
    private route: ActivatedRoute,
    private nav: GlobalNavService,
    public theme: GlobalThemeService,
    private translate: TranslateService,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((data) => {
      //Logger.log("hivemanager", "QUERY PARAMS", data);
    });
  }

  async ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('hivemanager.pickplan.title'));

    await this.tryToFinalizePreviousOrders();
    await this.fetchPlans();
  }

  private async tryToFinalizePreviousOrders() {
    this.hiveService.tryToFinalizePreviousOrders();
  }

  private async fetchPlans() {
    this.pricingInfo = await this.hiveService.getPricingInfo();
    Logger.log("hivemanager", "Received pricing info:", this.pricingInfo);
    Logger.log("hivemanager", "Pricing info plans:", this.pricingInfo.getPricingPlans());
    Logger.log("hivemanager", "Pricing info settings:", this.pricingInfo.getPaymentSettings());

    this.fetchingPlans = false;
  }

  public pickPlan(plan: HivePlugin.Payment.PricingPlan) {
    Logger.log("hivemanager", "pick plan", plan);
    this.nav.navigateTo(App.HIVE_MANAGER, "/hivemanager/pickplanpurchase", { queryParams: { planName: plan.getName() } });
  }
}
