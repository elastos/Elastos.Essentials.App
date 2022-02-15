import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarForegroundMode, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { DPosNode } from '../../model/nodes.model';
import { NodesService } from '../../services/nodes.service';



@Component({
    selector: 'app-vote',
    templateUrl: './vote.page.html',
    styleUrls: ['./vote.page.scss'],
})
export class VotePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    // Values
    public selectedNodes = 0;

    // Intent
    public voted = false;

    // Voting
    public voting = false;

    // DPosNode Detail
    public showNode = false;
    public nodeIndex: number;
    public node: DPosNode;

    // Toast for voteFailed/voteSuccess
    private toast: any = null;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public nodesService: NodesService,
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
    ) {
        const navigation = this.router.getCurrentNavigation();
        if (navigation.extras.state && navigation.extras.state.refreash) {
            void this.nodesService.init();
        }
    }

    ngOnInit() {
    }

    private async setRegistrationIcon() {
        await this.nodesService.init();

        if (!this.voteService.canVote()) {
            return;
        }

        switch (this.nodesService.dposInfo.state) {
            case 'Unregistered':
                this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: null, iconPath: BuiltInIcon.ADD });
                this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
                    void this.goToRegistration();
                });
                break;
            case 'Pending':
            case 'Active':
            case 'Inactive':
            case 'Canceled':
            case 'Illegal':
            case 'Returned':
                this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: null, iconPath: 'assets/dposregistration/icon/my-node.png' });
                this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
                    void this.globalNav.navigateTo(App.DPOS_REGISTRATION, '/dposregistration/unregistration');
                });
                break;
        }
    }

    async goToRegistration() {
        if (!this.nodesService.dposInfo.txConfirm) {
            this.globalNative.genericToast('dposregistration.text-registration-no-confirm');
            return;
        }

        if (!await this.nodesService.checkBalanceForRegDposNode()) {
            return;
        }

        if (!await this.popupProvider.ionicConfirm('wallet.text-warning', 'dposregistration.dpos-deposit-warning', 'common.ok', 'common.cancel')) {
            return;
        }

        await this.globalNav.navigateTo(App.DPOS_REGISTRATION, '/dposregistration/registration');
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('launcher.app-dpos-voting'));
        this.titleBar.setTheme('#732dcf', TitleBarForegroundMode.LIGHT);
        void this.setRegistrationIcon();
    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
        if (this.toast) {
            this.toast.dismiss();
        }
    }

    //// Vote intent ////
    async castVote() {
        this.voting = true;
        let castedNodeKeys: string[] = [];
        this.nodesService.dposList.forEach(node => {
            if (node.isChecked === true) {
                castedNodeKeys = castedNodeKeys.concat(node.ownerpublickey);
            }
        });

        if (castedNodeKeys.length > 0) {
            Logger.log('dposvoting', 'castedNodeKeys:', castedNodeKeys);
            void this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "dposvoting", "nodes", castedNodeKeys);
            let votesSent = false;

            try {
                let res = await this.globalIntentService.sendIntent(
                    "https://wallet.elastos.net/dposvotetransaction",
                    { publickeys: (castedNodeKeys) });

                Logger.log('dposvoting', 'Insent sent sucessfully', res);

                if (!res.result.txid) {
                    votesSent = true;
                    void this.voteFailed('dposvoting.vote-cancelled');
                }
                else {
                    votesSent = true;
                    this.voted = true;
                    let date = new Date;
                    let txid: string = res.result.txid;

                    this.nodesService._votes = this.nodesService._votes.concat({ date: date, tx: txid, keys: castedNodeKeys });
                    Logger.log('dposvoting', 'Vote history updated', this.nodesService._votes);
                    await this.nodesService.setStoredVotes();
                    void this.voteSuccess(res.result.txid);
                }
            }
            catch (err) {
                votesSent = true;
                Logger.log('dposvoting', 'Intent sent failed', err);
                void this.voteFailed(err);
            }

            // If no response is sent from wallet, show vote transaction has failed
            setTimeout(() => {
                if (votesSent === false) {
                    void this.voteFailed('dposvoting.vote-timeout');
                }
            }, 10000)
        }
        else {
            void this.noNodesChecked();
        }
        this.voting = false;
    }

    //// Define Values ////
    getVotes(votes: string): string {
        const fixedVotes: number = parseInt(votes);
        return fixedVotes.toLocaleString().split(/\s/).join(',');
    }

    getSelectedNodes(): number {
        this.selectedNodes = 0;
        this.nodesService.dposList.forEach(node => {
            if (node.isChecked === true) {
                this.selectedNodes++;
            }
        });
        return this.selectedNodes;
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
}


