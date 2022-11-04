import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { App } from 'src/app/model/app.enum';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { Vote } from '../../model/history.model';
import { NodesService } from '../../services/nodes.service';


@Component({
    selector: 'app-history',
    templateUrl: './history.page.html',
    styleUrls: ['./history.page.scss'],
})
export class HistoryPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public _votes: Vote[] = [];

    constructor(
        public nodesService: NodesService,
        public translate: TranslateService,
        private globalNav: GlobalNavService,
        public theme: GlobalThemeService
    ) { }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('launcher.app-dpos-voting'));
        //this.titleBar.setTheme('#732dcf', TitleBarForegroundMode.LIGHT);
    }

    showVoteDetail(vote: Vote) {
        void this.globalNav.navigateTo(App.DPOS_VOTING, '/dposvoting/menu/history/' + vote.tx);
    }

    modDate(date) {
        return moment(date).format("MMM Do YYYY, h:mm:ss a");
    }
}
