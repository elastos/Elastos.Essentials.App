import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { CRCouncilService } from 'src/app/voting/crcouncilvoting/services/crcouncil.service';
import { DPoS2Service } from '../../services/dpos2.service';

@Component({
    selector: 'app-my-votes',
    templateUrl: './my-votes.page.html',
    styleUrls: ['./my-votes.page.scss'],
})
export class MyVotesPage implements OnInit, OnDestroy {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    private votes = [];
    // DPoS2Node Detail
    public showNode = false;
    public nodeIndex: number;
    public node: any;

    public dataFetched = false;
    public signingAndTransacting = false;

    constructor(
        public dpos2Service: DPoS2Service,
        public crCouncilService: CRCouncilService,
        public theme: GlobalThemeService,
        public translate: TranslateService,
        public popupProvider: GlobalPopupService,
    ) { }



    async ngOnInit() {
    }

    ngOnDestroy() {
    }

    async initData() {
        this.dataFetched = false;
        await this.dpos2Service.init();
        this.votes = this.dpos2Service.myVotes;
        this.dataFetched = true;
    }

    ionViewWillEnter() {
        //this.titleBar.setBackgroundColor("#732CCE");
        //this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
        this.titleBar.setTitle(this.translate.instant('dposvoting.my-votes'));
        void this.initData();
    }

    ionViewDidEnter() {
    }

    ionViewWillLeave() {

    }

    showUpdateNode(index: number, node: any) {
        this.showNode = true;
        this.nodeIndex = index;
        this.node = node;
    }

    onClick(index: number) {
        this.showNode = false;
    }
}
