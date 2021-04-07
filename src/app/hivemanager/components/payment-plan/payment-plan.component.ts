import { Component, OnInit, Input } from '@angular/core';
import { HiveService } from '../../services/hive.service';
import { AppService } from '../../services/app.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { UiService } from '../../services/ui.service';

@Component({
    selector: 'payment-plan',
    templateUrl: './payment-plan.component.html',
    styleUrls: ['./payment-plan.component.scss'],
})
export class PaymentPlanComponent implements OnInit {
    @Input('activePlan') activePlan: any; // Real type is HivePlugin.Payment.ActivePricingPlan but angular can't find it
    @Input('purchaseablePlan') purchaseablePlan: any; // Real type is HivePlugin.Payment.PricingPlan but angular can't find it

    constructor(
        public appService: AppService,
        public hiveService: HiveService,
        public theme: GlobalThemeService,
        public UI: UiService
    ) { }

    ngOnInit() { }
}
