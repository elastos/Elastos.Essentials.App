import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { NgZone} from '@angular/core';
import * as moment from 'moment';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { HiveService } from '../../services/hive.service';
import { ActivatedRoute } from '@angular/router';
import { environment } from 'src/environments/environment';
import { AppService } from '../../services/app.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-pickplanpurchase',
  templateUrl: './pickplanpurchase.page.html',
  styleUrls: ['./pickplanpurchase.page.scss'],
})
export class PickPlanPurchasePage implements OnInit {
  public planToPurchase: HivePlugin.Payment.PricingPlan = null;

  constructor(
    public navCtrl: NavController,
    public zone: NgZone,
    private storage: GlobalStorageService,
    private hiveService: HiveService,
    private route: ActivatedRoute,
    private appService: AppService,
    public theme: GlobalThemeService,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(async (params: { planName: string}) => {
      this.planToPurchase = await this.hiveService.getActiveVault().getPayment().getPricingPlan(params.planName);
    });
  }

  async ionViewWillEnter() {
    // TODO @chad titleBarManager.setTitle(this.translate.instant('pickplanpurchase.title'));
  }

  /* TODO @chad
  ionViewDidEnter(){
    this.uxService.setTitleBarBackKeyShown(true);
  }

  ionViewWillLeave() {
    this.uxService.setTitleBarBackKeyShown(false);
  }
  */

  public async purchasePlan() {
    let pricingInfo = await this.hiveService.getPricingInfo();
    await this.hiveService.purchasePlan(pricingInfo.getPaymentSettings(), this.planToPurchase);

    this.navCtrl.navigateRoot("pickprovider");
  }
}
