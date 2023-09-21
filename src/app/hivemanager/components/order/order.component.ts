import { Component, Input, OnInit } from '@angular/core';
import { Order } from '@elastosfoundation/hive-js-sdk';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { AppService } from '../../services/app.service';
import { HiveService } from '../../services/hive.service';
import { UiService } from '../../services/ui.service';

@Component({
    selector: 'order',
    templateUrl: './order.component.html',
    styleUrls: ['./order.component.scss'],
})
export class OrderComponent implements OnInit {
    @Input('order') order: Order; // Real type is HiveSDK Order but angular can't find it

    public friendlyOrderState = "";

    constructor(
        public appService: AppService,
        public hiveService: HiveService,
        public theme: GlobalThemeService,
        public UI: UiService
    ) { }

    ngOnInit() {
        void this.hiveService.getFriendlyOrderState(this.order).then(state => {
            this.friendlyOrderState = state;
        });
    }

    public getPricingPlanName(): string {
        return this.order.getPricingPlan();
    }
}
