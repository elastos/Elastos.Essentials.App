import { Component, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { App } from 'src/app/model/app.enum';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';


@Component({
    selector: 'app-options',
    templateUrl: './options.component.html',
    styleUrls: ['./options.component.scss'],
})
export class CRMemberOptionsComponent implements OnInit {

    constructor(
        public theme: GlobalThemeService,
        private popoverCtrl: PopoverController,
        private globalNav: GlobalNavService,
    ) { }

    ngOnInit() {
    }

    impeachMember() {
        void this.popoverCtrl.dismiss();
        void this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/impeach');
    }
}
