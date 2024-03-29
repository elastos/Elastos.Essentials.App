import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem, TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { App } from 'src/app/model/app.enum';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { Vote } from '../../model/history.model';
import { DPosNode } from '../../model/nodes.model';
import { NodesService } from '../../services/nodes.service';
@Component({
    selector: 'app-tx',
    templateUrl: './tx.page.html',
    styleUrls: ['./tx.page.scss'],
})
export class TxPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    // Initial values
    public vote: Vote;
    public _nodes: DPosNode[] = [];

    // DPosNode Detail
    public showNode = false;
    public nodeIndex: number;
    public node: DPosNode;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public nodesService: NodesService,
        private route: ActivatedRoute,
        public translate: TranslateService,
        private globalNav: GlobalNavService,
        public theme: GlobalThemeService
    ) { }

    ngOnInit() {
        this.route.paramMap.subscribe(paramMap => {
            if (!paramMap.has('txid')) {
                void this.globalNav.navigateBack();
                return;
            }
            this.vote = this.nodesService.getVote(paramMap.get('txid'));
            this.getNodes();
        });
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('launcher.app-dpos-voting'));
        this.titleBar.setNavigationMode(TitleBarNavigationMode.CUSTOM);
        this.titleBar.setIcon(TitleBarIconSlot.INNER_LEFT, { key: null, iconPath: BuiltInIcon.BACK });
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
            void this.globalNav.navigateRoot(App.DPOS_VOTING, '/dposvoting/menu/history');
        });
    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    getNodes() {
        this._nodes = [];
        this.nodesService._nodes.map(node => {
            if (this.vote.keys.indexOf(node.ownerpublickey) != -1) {
                this._nodes = this._nodes.concat(node)
            }
        });
    }

    modDate(date) {
        return moment(date).format("MMM Do YYYY, h:mm:ss a");
    }

    //// Define Values ////
    getVotes(votes: string): string {
        const fixedVotes: number = parseInt(votes);
        return fixedVotes.toLocaleString().split(/\s/).join(',');
    }

    getVotePercent(votes: string): string {
        const votePercent: number = parseFloat(votes) / this.nodesService.totalVotes * 100;
        return votePercent.toFixed(2);
    }

    //// DPosNode Detail ////
    _showNode(index: number, node: DPosNode) {
        this.showNode = !this.showNode;
        this.nodeIndex = index;
        this.node = node;
    }

    return() {
        this.showNode = false;
    }
}
