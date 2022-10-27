import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { CRCouncilService } from 'src/app/voting/crcouncilvoting/services/crcouncil.service';
import { VoteService } from 'src/app/voting/services/vote.service';
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
        private storage: GlobalStorageService,
        private globalNative: GlobalNativeService,
        public theme: GlobalThemeService,
        private voteService: VoteService,
        public translate: TranslateService,
        public popupProvider: GlobalPopupService,
    ) { }



    async ngOnInit() {
    }

    ngOnDestroy() {
    }

    async ionViewWillEnter() {
        //this.titleBar.setBackgroundColor("#732CCE");
        //this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
        this.titleBar.setTitle(this.translate.instant('dposvoting.my-votes'));

        this.dataFetched = false;
        if (this.dpos2Service.needRefreshNodes) {
            await this.dpos2Service.fetchNodes();
        }
        this.votes = await this.dpos2Service.getAllVoteds();
        this.dataFetched = true;
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
        if (index == -1) {
            this.showNode = false;
        }
        else {
            this.update(index);
        }
    }

    update(index: number) {
        alert(index);
    }


}
