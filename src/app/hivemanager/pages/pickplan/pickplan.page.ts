import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PricingPlan } from '@elastosfoundation/hive-js-sdk';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from "src/app/model/app.enum";
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { HiveService } from '../../services/hive.service';

@Component({
  selector: 'app-pickplan',
  templateUrl: './pickplan.page.html',
  styleUrls: ['./pickplan.page.scss'],
})
export class PickPlanPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public fetchingPlans = true;
  public availablePricingPlans: PricingPlan[];

  constructor(
    public zone: NgZone,
    private hiveService: HiveService,
    private route: ActivatedRoute,
    private nav: GlobalNavService,
    public theme: GlobalThemeService,
    private translate: TranslateService,
  ) { }

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

  private tryToFinalizePreviousOrders() {
    return this.hiveService.tryToFinalizePreviousOrders();
  }

  private async fetchPlans() {
    this.availablePricingPlans = await this.hiveService.getPricingPlans();
    Logger.log("hivemanager", "Received pricing plans:", this.availablePricingPlans);

    this.fetchingPlans = false;
  }

  public pickPlan(plan: PricingPlan) {
    Logger.log("hivemanager", "pick plan", plan);
    void this.nav.navigateTo(App.HIVE_MANAGER, "/hivemanager/pickplanpurchase", { queryParams: { planName: plan.getName() } });
  }
}
