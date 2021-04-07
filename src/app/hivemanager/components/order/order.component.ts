import { Component, OnInit, Input } from '@angular/core';
import { HiveService } from '../../services/hive.service';
import { AppService } from '../../services/app.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { UiService } from '../../services/ui.service';

@Component({
    selector: 'order',
    templateUrl: './order.component.html',
    styleUrls: ['./order.component.scss'],
})
export class OrderComponent implements OnInit {
    @Input('order') order: any; // Real type is HivePlugin.Payment.Order but angular can't find it

    constructor(
        public appService: AppService,
        public hiveService: HiveService,
        public theme: GlobalThemeService,
        public UI: UiService
    ) { }

    ngOnInit() {
    }

    public getFriendlyOrderState(order: HivePlugin.Payment.Order ) {
        return this.hiveService.getFriendlyOrderState(order);
    }
}
