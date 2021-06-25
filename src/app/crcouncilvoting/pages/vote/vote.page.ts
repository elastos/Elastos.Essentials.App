import { Component, OnInit, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { CandidatesService } from '../../services/candidates.service';
import { ToastController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TranslateService } from '@ngx-translate/core';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { App } from 'src/app/model/app.enum'
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { VoteService } from 'src/app/vote/services/vote.service';

@Component({
    selector: 'app-vote',
    templateUrl: './vote.page.html',
    styleUrls: ['./vote.page.scss'],
})
export class VotePage implements OnInit, OnDestroy {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    constructor(
        public candidatesService: CandidatesService,
        private storage: GlobalStorageService,
        private toastCtrl: ToastController,
        private globalNav: GlobalNavService,
        private globalNative: GlobalNativeService,
        private globalIntentService: GlobalIntentService,
        public theme: GlobalThemeService,
        private route: ActivatedRoute,
        private voteService: VoteService,
        public translate: TranslateService
    ) { }

    public castingVote = false;
    public votesCasted = false;
    public totalEla: number = 0;
    private votedEla: number = 0;
    private toast: any;

    ngOnInit() {
        Logger.log('crcouncil', 'My Candidates', this.candidatesService.selectedCandidates);
        let elaamount = this.voteService.masterWallet.subWallets.ELA.balance;
        const fees = 0.001;// it is enough.
        this.totalEla = Math.floor(elaamount.toNumber() / 100000000 - fees);
        Logger.log('crcouncil', 'ELA Balance', this.totalEla);
    }

    ngOnDestroy() {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crcouncilvoting.my-candidates'));
    }

    ionViewDidEnter() {
    }

    ionViewWillLeave() {
        this.castingVote = false;
        this.votesCasted = false;

        if (this.toast) {
            this.toast.dismiss();
        }
    }

    distribute() {
        let votes = this.totalEla / this.candidatesService.selectedCandidates.length;
        Logger.log('crcouncil', 'Distributed votes', votes);
        this.candidatesService.selectedCandidates.forEach((candidate) => {
            candidate.userVotes = votes;
        });
    }

    /****************** Cast Votes *******************/
    cast() {
        let votedCandidates = {};
        this.candidatesService.selectedCandidates.map((candidate) => {
            if (candidate.userVotes && candidate.userVotes > 0) {
                let userVotes = candidate.userVotes * 100000000;
                let _candidate = { [candidate.cid]: userVotes.toFixed(0) } //SELA, can't with fractions
                votedCandidates = { ...votedCandidates, ..._candidate }
            } else {
                candidate.userVotes = 0;
            }
        });

        if (Object.keys(votedCandidates).length === 0) {
            this.toastErr(this.translate.instant('crcouncilvoting.pledge-some-ELA-to-candidates'));
        } else if (this.votedEla > this.totalEla) {
            this.toastErr(this.translate.instant('crcouncilvoting.not-allow-pledge-more-than-own'));
        } else {
            Logger.log('crcouncil', votedCandidates);
            this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, 'crcouncil', 'votes', this.candidatesService.selectedCandidates);
            this.castingVote = true;
            this.votesCasted = false;

            setTimeout(async () => {
                try {
                    let res = await this.globalIntentService.sendIntent(
                        'https://wallet.elastos.net/crmembervote',
                        { votes: votedCandidates });

                    if (res.result.txid === null) {
                        this.castingVote = false;
                        this.voteFailedToast(this.translate.instant('crcouncilvoting.vote-incomplete'));
                    } else {
                        Logger.log('crcouncil', 'Intent sent sucessfully', res);
                        this.castingVote = false;
                        this.votesCasted = true;
                        this.voteSuccessToast(res.result.txid);
                    }
                }
                catch (err) {
                    Logger.log('crcouncil', 'Intent sent failed', err);
                    this.castingVote = false;
                    this.voteFailedToast(err);
                }
            }, 1000);
        }
    }

    /****************** Misc *******************/
    setInputDefault(event) {
        Logger.log('crcouncil', event);
    }

    getElaRemainder() {
        this.votedEla = 0;
        this.candidatesService.selectedCandidates.map((can) => {
            this.votedEla += can.userVotes;
        });
        let remainder = this.totalEla - this.votedEla;
        return remainder.toFixed(2);
    }

    /****************** Toasts/Alerts *******************/
    async toastErr(msg: string) {
        this.toast = await this.toastCtrl.create({
            header: msg,
            position: 'bottom',
            color: 'primary',
            mode: 'ios',
            duration: 2000
        });
        this.toast.onWillDismiss(() => {
            this.toast = null;
        })
        this.toast.present();
    }

    async voteSuccessToast(txid: string = 'adwfw3r3wdwagyfgw3dfwdg83addwefwsfssg5g4fwdwsdqdgyywqdqw') {
        this.toast = await this.toastCtrl.create({
            mode: 'ios',
            position: 'bottom',
            color: 'primary',
            header: this.translate.instant('common.vote-success'),
            message: `${txid.slice(0, 16) + '<br>' + txid.slice(16, 32) + '<br>' + txid.slice(32, 48)}`,
            buttons: [
                {
                    text: this.translate.instant('common.copy'),
                    handler: () => {
                        this.toast.dismiss();
                        this.globalNative.genericToast('common.tx-copied-to-clipboard');
                        this.globalNative.copyClipboard(txid);
                        this.globalNav.navigateRoot(App.CRCOUNCIL_VOTING, '/crcouncilvoting/candidates');
                    }
                },
                {
                    text: this.translate.instant('common.dismiss'),
                    handler: () => {
                        this.toast.dismiss();
                        this.globalNav.navigateRoot(App.CRCOUNCIL_VOTING, '/crcouncilvoting/candidates');
                    }
                }
            ]
        });
        this.toast.onWillDismiss(() => {
            this.toast = null;
        })
        this.toast.present();
    }

    async voteFailedToast(err: string) {
        this.toast = await this.toastCtrl.create({
            mode: 'ios',
            position: 'bottom',
            color: 'primary',
            message: err,
            buttons: [
                {
                    text: this.translate.instant('common.ok'),
                    handler: () => {
                        this.toast.dismiss();
                        this.globalNav.navigateRoot(App.CRCOUNCIL_VOTING, '/crcouncilvoting/candidates');
                    }
                }
            ]
        });
        this.toast.onWillDismiss(() => {
            this.toast = null;
        })
        this.toast.present();
    }
}
