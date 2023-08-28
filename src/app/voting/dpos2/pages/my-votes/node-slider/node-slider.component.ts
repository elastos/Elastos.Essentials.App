import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { RenewalVotesContentInfo, VotingInfo } from '@elastosfoundation/wallet-js-sdk/typings/transactions/payload/Voting';
import { IonSlides } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { UXService } from 'src/app/voting/services/ux.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { Config } from 'src/app/wallet/config/Config';
import { DPoS2Node } from '../../../model/nodes.model';
import { DPoS2Service } from '../../../services/dpos2.service';

@Component({
    selector: 'app-node-slider-update',
    templateUrl: './node-slider.component.html',
    styleUrls: ['./node-slider.component.scss'],
})
export class NodeSliderComponent implements OnInit {

    @ViewChild('slider', { static: false }) slider: IonSlides;

    @Output() buttonClick = new EventEmitter<number>();

    @Input() _nodes = [];
    @Input() totalVotes = 0;
    @Input() nodeIndex: number;
    @Input() node: DPoS2Node;

    public displayedNodes: DPoS2Node[] = [];
    public stakeDays = 0;
    public signingAndTransacting = false;
    public currentHeight = 0;
    private useMaxStakeDays = false;

    slideOpts = {
        initialSlide: 1,
        speed: 400,
        centeredSlides: true,
        slidesPerView: 1.2
    };

    constructor(
        public uxService: UXService,
        public dpos2Service: DPoS2Service,
        public theme: GlobalThemeService,
        public translate: TranslateService,
        private globalNative: GlobalNativeService,
        public popupProvider: GlobalPopupService,
        public voteService: VoteService,
    ) {
    }

    async ngOnInit() {
        this.displayedNodes = this._nodes.slice(0, this.nodeIndex + 2);
        this.slideOpts.initialSlide = this.displayedNodes.indexOf(this.node);
        this.currentHeight = await GlobalElastosAPIService.instance.getCurrentHeight();

        //reset inputStakeDays
        this._nodes.forEach(n => {
            n.inputStakeDays = n.lockDays;
        })
    }

    //// Increment nodes array when sliding forward ////
    loadNext() {
        let lastNode: DPoS2Node = this.displayedNodes.slice(-1)[0];
        let nextNodeIndex: number = this._nodes.indexOf(lastNode) + 1;
        if (this._nodes[nextNodeIndex]) {
            this.displayedNodes.push(this._nodes[nextNodeIndex]);
        } else {
            return;
        }
        Logger.log('dposvoting', 'last node', lastNode);
        Logger.log('dposvoting', 'next node', this._nodes[nextNodeIndex]);
    }

    cancel() {
        this.buttonClick.emit(-1);
    }

    async update(node: any) {
        let maxStakeDays = Math.ceil((this.getUserMaxStakeBlockHeight(node) - this.currentHeight) / 720);

        if (node.inputStakeDays < node.lockDays) {
            let msg = this.translate.instant('dposvoting.stakedays-input-err', {days: node.lockDays});
            this.globalNative.genericToast(msg);
            return;
        }

        if (node.inputStakeDays > maxStakeDays) {
            this.globalNative.genericToast('voting.vote-max-deadline');
            return;
        }

        if (node.nodeState != 'Active') {
            let confirmed = await this.popupProvider.showConfirmationPopup(
                this.translate.instant('dposvoting.confirm-update-title'),
                this.translate.instant('dposvoting.confirm-update-prompt'),
                this.translate.instant('common.update'),
                "/assets/identity/default/publishWarning.svg");
            if (!confirmed) {
                return;
            }
        }

        this.signingAndTransacting = true;
        await this.globalNative.showLoading(this.translate.instant('common.please-wait'));

        try {
            const stakeDaysWarningThreshold = 180;
            let stakeDays = 0;

            this.currentHeight = await GlobalElastosAPIService.instance.getCurrentHeight();
            let locktime;
            if (this.useMaxStakeDays) { // Max
                locktime = node.userLocktime;
                stakeDays = Math.ceil((node.userLocktime - this.currentHeight) / 720);
            } else {
                stakeDays = node.inputStakeDays;
                locktime = this.currentHeight + node.inputStakeDays * 720;
                if (locktime > node.stakeuntil) {
                    this.globalNative.genericToast('dposvoting.stake-days-more-than-stakeuntil');
                    return;
                }
            }

            // if the vote duration is longer than 6 months, need to double confirm
            if (stakeDays > stakeDaysWarningThreshold) {
              await this.globalNative.hideLoading();
              let confirmed = await this.popupProvider.showConfirmationPopup(
                      this.translate.instant('dposvoting.double-confirm-title'),
                      this.translate.instant('dposvoting.pledge-period-too-long-confirm-prompt', {days: stakeDays}),
                      this.translate.instant('common.continue'),
                      "/assets/identity/default/publishWarning.svg");
              if (!confirmed) {
                  return;
              }
              await this.globalNative.showLoading(this.translate.instant('common.please-wait'));
            }

            if (!await this.voteService.checkWalletAvailableForVote()) {
                return;
            }

            let votes = Util.accMul(parseFloat(node.votes), Config.SELA).toString();
            let voteContentInfo: RenewalVotesContentInfo = {
                ReferKey: node.referkey,
                VoteInfo: {
                    Candidate: node.candidate,
                    Votes: votes,
                    Locktime: locktime
                }
            };

            const payload: VotingInfo = {
                Version: 1,
                RenewalVotesContent: [voteContentInfo]
            };

            Logger.log(App.DPOS2, "Updata vote's payload:", payload);

            const rawTx = await this.voteService.sourceSubwallet.createDPoSV2VoteTransaction(
                payload,
                '', //memo
            );
            // Logger.log(App.DPOS2, "rawTx:", rawTx);
            await this.globalNative.hideLoading();

            let ret = await this.voteService.signAndSendRawTransaction(rawTx, App.DPOS2, "/dpos2/menu/my-votes");
            if (ret) {
                node.lockDays = node.inputStakeDays;
                this.voteService.toastSuccessfully('dposvoting.update-vote');
                this.buttonClick.emit(node.index);
            }
        }
        catch (e) {
            await this.voteService.popupErrorMessage(e);
        }
        finally {
            await this.globalNative.hideLoading();
            this.signingAndTransacting = false;
        }
    }

    public checkInputDays(node: any): boolean {
        let maxStakeDays = Math.ceil((this.getUserMaxStakeBlockHeight(node) - this.currentHeight) / 720);

        var inputStakeDays = node.inputStakeDays || 0;
        if (inputStakeDays < node.lockDays) {
            return true;
        }

        if (inputStakeDays > maxStakeDays) {
            return true;
        }

        // MAX stake days
        if (this.useMaxStakeDays) {
            return false;
        }

        let locktime = this.currentHeight + inputStakeDays * 720;
        return (locktime > node.stakeuntil);
    }

    public onInputDaysFocus(node: any) {
        if (node.inputStakeDays == 0) {
            node.inputStakeDays = null;
        }
    }

    public onInputDaysBlur(node: any) {
        if (node.inputStakeDays == null) {
            node.inputStakeDays = node.lockDays;
        }
        node.inputStakeDays = Math.floor(node.inputStakeDays);
        this.useMaxStakeDays = false;
    }

    calcVoteRights(node: any) {
        if (node.inputStakeDays) {
            let totalStakeDays = this.currentHeight - node.blockheight + node.inputStakeDays * 720;
            return this.uxService.toThousands(parseFloat(node.votes) * Math.log10(totalStakeDays / 720), 0);
        }
        else {
            return Math.floor(node.voteRights);
        }
    }

    setMaxStakeDays(node: any) {
        node.userLocktime = this.getUserMaxStakeBlockHeight(node)
        node.inputStakeDays = Math.ceil((node.userLocktime - this.currentHeight) / 720);

        this.useMaxStakeDays = true;
    }

    getUserMaxStakeBlockHeight(node: any) {
        let blockHeight = 0;
        if (node.blockheight + 720000 >= node.stakeuntil) {
            blockHeight = node.stakeuntil;
        } else {
            blockHeight = node.blockheight + 720000;
        }

        return blockHeight;
    }

}

