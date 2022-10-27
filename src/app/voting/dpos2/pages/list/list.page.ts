import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { App } from 'src/app/model/app.enum';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
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

    // Voting
    public voting = false;

    // DPoS2Node Detail
    public showNode = false;
    public nodeIndex: number;
    public node: DPoS2Node;

    // Toast for voteFailed/voteSuccess
    private toast: any = null;

    private inited = false;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public dpos2Service: DPoS2Service,
        private storage: GlobalStorageService,
        private toastController: ToastController,
        private translate: TranslateService,
        private globalNative: GlobalNativeService,
        private globalNav: GlobalNavService,
        private globalIntentService: GlobalIntentService,
        public voteService: VoteService,
        public theme: GlobalThemeService,
        public popupProvider: GlobalPopupService,
        private router: Router,
        public zone: NgZone,
    ) {
        const navigation = this.router.getCurrentNavigation();
        if (navigation.extras.state && navigation.extras.state.refreash) {
            void this.dpos2Service.init();
        }

        GlobalFirebaseService.instance.logEvent("voting_dpos_vote_enter");
    }

    async ngOnInit() {

    }

    private async setRegistrationIcon() {
        if (!this.inited) {
            await this.dpos2Service.init();
            await this.getSelectedNodes();
            this.inited = true;
        }

        if (this.dpos2Service.dposInfo.state == 'Unregistered'
                || (this.dpos2Service.dposInfo.state == 'Active' && this.dpos2Service.dposInfo.identity == "DPoSV1")) {
            this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: null, iconPath: BuiltInIcon.ADD });
            this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
                void this.goToRegistration();
            });
        }
        else if (this.dpos2Service.dposInfo.state != 'Returned') {
            this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: null, iconPath: 'assets/dposvoting/icon/my-node.png' });
            this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
                void this.globalNav.navigateTo(App.DPOS_VOTING, '/dpos2/node-detail');
            });
        }
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('launcher.app-dpos2-voting'));
        //this.titleBar.setTheme('#732dcf', TitleBarForegroundMode.LIGHT);
        void this.setRegistrationIcon();
    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
        if (this.toast) {
            this.toast.dismiss();
        }
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

        await this.globalNav.navigateTo(App.DPOS_VOTING, '/dpos2/registration');
    }

    castVote() {
        void this.globalNav.navigateTo(App.DPOS_VOTING, '/dpos2/vote');
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

    getVotePercent(votes: string): string {
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

    async voteSuccess(txid: string) {
        this.closeToast();
        this.toast = await this.toastController.create({
            position: 'bottom',
            header: this.translate.instant('common.vote-success'),
            message: `${txid.slice(0, 16) + '<br>' + txid.slice(16, 32) + '<br>' + txid.slice(32, 48)}`,
            color: "primary",
            duration: 2000,
            buttons: [
                {
                    text: this.translate.instant('common.copy'),
                    handler: () => {
                        this.toast.dismiss();
                        this.globalNative.genericToast('common.tx-copied-to-clipboard');
                        void this.globalNative.copyClipboard(txid);
                    }
                },
                {
                    text: this.translate.instant('common.dismiss'),
                    handler: () => {
                        this.toast.dismiss();
                    }
                },
            ],
        });
        this.toast.onWillDismiss(() => {
            this.toast = null;
        })
        this.toast.present();
    }

    async voteFailed(res: string) {
        this.closeToast();
        this.toast = await this.toastController.create({
            position: 'bottom',
            header: this.translate.instant('dposvoting.vote-fail'),
            message: this.translate.instant(res),
            color: "primary",
            duration: 2000,
            buttons: [
                {
                    text: this.translate.instant('common.ok'),
                    handler: () => {
                        this.toast.dismiss();
                    }
                }
            ]
        });
        this.toast.onWillDismiss(() => {
            this.toast = null;
        })
        this.toast.present();
    }

    // If we get response from sendIntent, we need to close the toast showed for timeout
    closeToast() {
        if (this.toast) {
            this.toast.dismiss();
            this.toast = null;
        }
    }

    async noNodesChecked() {
        const toast = await this.toastController.create({
            position: 'bottom',
            header: this.translate.instant('dposvoting.vote-no-nodes-checked'),
            color: "primary",
            duration: 2000
        });
        await toast.present();
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
        return this.translate.instant('dposvoting.node-exprie-message', {time: this.dpos2Service.myStakeExpired30});
    }
}


