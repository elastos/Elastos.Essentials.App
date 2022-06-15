import { Component, Input, OnInit } from '@angular/core';
import { VaultInfo } from '@elastosfoundation/hive-js-sdk';
import moment from 'moment';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { AppService } from '../../services/app.service';
import { HiveService } from '../../services/hive.service';
import { UiService } from '../../services/ui.service';

@Component({
    selector: 'payment-plan',
    templateUrl: './payment-plan.component.html',
    styleUrls: ['./payment-plan.component.scss'],
})
export class PaymentPlanComponent implements OnInit {
    @Input('activePlan') activePlan: VaultInfo;
    @Input('purchaseablePlan') purchaseablePlan: any; // Real type is HivePlugin.Payment.PricingPlan but angular can't find it

    constructor(
        public appService: AppService,
        public hiveService: HiveService,
        public theme: GlobalThemeService,
        public UI: UiService
    ) { }

    ngOnInit() { }

    public getActivePlanName(): string {
        return this.activePlan.getPricePlan();
    }

    public getActivePlanMaxStorage(): number {
        return this.activePlan.getStorageQuota() / (1024 * 1024);
    }

    public getActivePlanStorageUsed(): number {
        return this.activePlan.getStorageUsed() / (1024 * 1024);
    }

    public getActivePlanStartDate(): string {
        return this.UI.getFriendlyDate(moment(this.activePlan.getCreated()).unix());
    }
}
