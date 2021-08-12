import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as moment from 'moment';

import { Vote } from '../../model/history.model';
import { NodesService } from '../../services/nodes.service';
import { DPosNode } from '../../model/nodes.model';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarForegroundMode, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem, TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { TranslateService } from '@ngx-translate/core';
import { App } from 'src/app/model/app.enum';
import { NavController } from '@ionic/angular';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

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
    public showNode: boolean = false;
    public nodeIndex: number;
    public node: DPosNode;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public nodesService: NodesService,
        private route: ActivatedRoute,
        public translate: TranslateService,
        private globalNav: GlobalNavService,
        private navCtrl: NavController,
        public theme: GlobalThemeService
    ) { }

    ngOnInit() {
        this.route.paramMap.subscribe(paramMap => {
            if (!paramMap.has('txid')) {
                this.globalNav.navigateBack();
                return;
            }
            this.vote = this.nodesService.getVote(paramMap.get('txid'));
            this.getNodes();
        });
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('launcher.app-dpos-voting'));
        this.titleBar.setTheme('#732dcf', TitleBarForegroundMode.LIGHT);
        this.titleBar.setIcon(TitleBarIconSlot.INNER_LEFT, { key: null, iconPath: BuiltInIcon.BACK });
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
            this.navCtrl.navigateBack('/dposvoting/menu/history');
        });
    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    getNodes() {
        this._nodes = [];
        this.nodesService._nodes.map(node => {
            if (this.vote.keys.includes(node.ownerpublickey)) {
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
