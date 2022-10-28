import { Component, OnInit, ViewChild } from '@angular/core';
import { IonInput } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { DPoS2Node } from '../../model/nodes.model';
import { DPoS2Service } from '../../services/dpos2.service';


@Component({
    selector: 'app-search',
    templateUrl: './search.page.html',
    styleUrls: ['./search.page.scss'],
})
export class SearchPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;
    @ViewChild('search', { static: false }) search: IonInput;

    // Search values
    public filteredNodes: DPoS2Node[] = [];
    public _node = '';

    // DPoS2Node Detail
    public showNode = false;
    public nodeIndex: number;
    public node: DPoS2Node;

    constructor(
        public dpos2Service: DPoS2Service,
        public translate: TranslateService,
        public theme: GlobalThemeService
    ) { }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('launcher.app-dpos2-voting'));
        //this.titleBar.setTheme('#732dcf', TitleBarForegroundMode.LIGHT);
    }

    ionViewDidEnter() {
        setTimeout(() => {
            void this.search.setFocus();
        }, 200);
    }

    //// Search ////
    filterNodes(search: string): any {
        this.filteredNodes = this.dpos2Service._nodes.filter((node) => {
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
        const votePercent: number = parseFloat(votes) / this.dpos2Service.totalVotes * 100;
        return votePercent.toFixed(2);
    }

    //// DPoS2Node Detail ////
    _showNode(index: number, node: DPoS2Node) {
        this.showNode = !this.showNode;
        this.nodeIndex = index;
        this.node = node;
    }

    return() {
        this.showNode = false;
    }
}
