import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { App } from 'src/app/model/app.enum';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { DPoS2Node } from '../../model/nodes.model';
import { DPoS2Service } from '../../services/dpos2.service';

@Component({
    selector: 'app-list',
    templateUrl: './list.page.html',
    styleUrls: ['./list.page.scss'],
})
export class ListPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    // Values
    public selectedNodes = 0;

    // Intent
    public voted = false;

    // DPoS2Node Detail
    public showNode = false;
    public nodeIndex: number;
    public node: DPoS2Node;

    public dataFetched = false;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public dpos2Service: DPoS2Service,
        private translate: TranslateService,
        private globalNative: GlobalNativeService,
        private globalNav: GlobalNavService,
        public voteService: VoteService,
        public theme: GlobalThemeService,
        public popupProvider: GlobalPopupService,
        private router: Router,
        public zone: NgZone,
    ) {
        const navigation = this.router.getCurrentNavigation();
        if (navigation.extras.state && navigation.extras.state.refreash) {
            void this.initData();
        }

        GlobalFirebaseService.instance.logEvent("voting_dpos_vote_enter");
    }

    async ngOnInit() {

    }

    private async initData() {
        this.dataFetched = false;
        await this.dpos2Service.init();
        await this.getSelectedNodes();

        if (this.dpos2Service.dposInfo.state == 'Unregistered'
            || (this.dpos2Service.dposInfo.state == 'Active' && this.dpos2Service.dposInfo.identity == "DPoSV1")) {
            this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: null, iconPath: BuiltInIcon.ADD });
            this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
                void this.goToRegistration();
            });
        }
        else if (this.dpos2Service.dposInfo.state != 'Returned') {
            this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: null, iconPath: this.theme.darkMode ? 'assets/dposvoting/icon/darkmode/node.svg' : 'assets/dposvoting/icon/node.svg' });
            this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
                void this.globalNav.navigateTo(App.DPOS2, '/dpos2/node-detail');
            });
        }

        this.dataFetched = true;
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('launcher.app-dpos2-voting'));
        //this.titleBar.setTheme('#732dcf', TitleBarForegroundMode.LIGHT);
        void this.initData();
    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    async goToRegistration() {
        if (!this.dpos2Service.dposInfo.txConfirm) {
            this.globalNative.genericToast('dposvoting.text-registration-no-confirm');
            return;
        }

        if (!await this.dpos2Service.checkBalanceForRegDposNode()) {
            return;
        }

        if (!await this.popupProvider.ionicConfirm('wallet.text-warning', 'dposvoting.dpos-deposit-warning', 'common.ok', 'common.cancel')) {
            return;
        }

        await this.globalNav.navigateTo(App.DPOS2, '/dpos2/registration');
    }

    async castVote() {
        let castedNodeKeys: string[] = [];
        this.dpos2Service.activeNodes.forEach(node => {
            if (node.isChecked === true) {
                castedNodeKeys = castedNodeKeys.concat(node.ownerpublickey);
            }
        });

        if (castedNodeKeys.length > 0) {
            await this.dpos2Service.setStoredVotes(castedNodeKeys);
            void this.globalNav.navigateTo(App.DPOS2, '/dpos2/vote');
        }
    }

    //// Define Values ////
    getVotes(votes: string): string {
        const fixedVotes: number = parseInt(votes);
        return fixedVotes.toLocaleString().split(/\s/).join(',');
    }

    getSelectedNodes(): number {
        var selectedNodes = 0;
        this.dpos2Service.dposList.forEach(node => {
            if (node.isChecked === true) {
                selectedNodes++;
            }
        });
        this.selectedNodes = selectedNodes;
        return this.selectedNodes;
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

    clickCheckBox(node: any) {
        this.zone.run(() => {
            if (node.isChecked) {
                this.selectedNodes--;
            }
            else {
                this.selectedNodes++;
            }
        });
    }

    getMyStakeExpired(): string {
        return this.translate.instant('dposvoting.node-exprie-message', { time: this.dpos2Service.myStakeExpired30 });
    }

    goTo(url: string) {
        void this.globalNav.navigateTo(App.DPOS2, url);
    }

}


