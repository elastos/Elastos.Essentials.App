import { Component, OnInit, ViewChild } from '@angular/core';
import { IonInput } from '@ionic/angular';

import { NodesService } from '../../services/nodes.service';
import { DPosNode } from '../../model/nodes.model';
import { Logger } from 'src/app/logger';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-search',
    templateUrl: './search.page.html',
    styleUrls: ['./search.page.scss'],
})
export class SearchPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;
    @ViewChild('search', { static: false }) search: IonInput;

    // Search values
    public filteredNodes: DPosNode[] = [];
    public _node: string = '';

    // DPosNode Detail
    public showNode: boolean = false;
    public nodeIndex: number;
    public node: DPosNode;

    constructor(
        public nodesService: NodesService,
        public translate: TranslateService,
        public theme: GlobalThemeService
    ) { }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('launcher.app-dpos-voting'));
        this.titleBar.setTheme('#732dcf', TitleBarForegroundMode.LIGHT);
    }

    ionViewDidEnter() {
        setTimeout(() => {
            this.search.setFocus();
        }, 200);
    }

    //// Search ////
    filterNodes(search: string): any {
        this.filteredNodes = this.nodesService._nodes.filter((node) => {
            if (!search) {
                return;
            } else {
                return node.nickname.toLowerCase().indexOf(search.toLowerCase()) !== -1;
            }
        });
        Logger.log('dposvoting', 'Search results', this.filteredNodes);
    }

    //// Define Values ////
    getVotes(votes): string {
        const fixedVotes: number = parseInt(votes);
        return fixedVotes.toLocaleString().split(/\s/).join(',');
    }

    getVotePercent(votes): string {
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
