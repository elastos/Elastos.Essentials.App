import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { IonSlides } from '@ionic/angular';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { ProposalService } from 'src/app/voting/crproposalvoting/services/proposal.service';
import { UXService } from 'src/app/voting/services/ux.service';
import { StakeService, VoteType } from '../../../services/stake.service';

@Component({
    selector: 'app-vote-slider-details',
    templateUrl: './vote-slider.component.html',
    styleUrls: ['./vote-slider.component.scss'],
})
export class VoteSliderComponent implements OnInit {
    @ViewChild('slider', { static: false }) slider: IonSlides;

    @Input() voteInfos = [];
    // @Input() totalVotes = 0;
    @Input() index: number;
    // @Input() voteInfo: any;

    public displayedInfos: any[] = [];
    public dataFetched = false;

    slideOpts = {
        initialSlide: 1,
        speed: 400,
        centeredSlides: true,
        slidesPerView: 1.2
    };

    constructor(
        public uxService: UXService,
        private stakeService: StakeService,
        private globalElastosAPIService: GlobalElastosAPIService,
        private globalJsonRPCService: GlobalJsonRPCService,
        private proposalService: ProposalService,
        public theme: GlobalThemeService
    ) {
    }

    ngOnInit() {
        this.voteInfos = this.stakeService.votesRight.voteInfos.slice(0, 4);
        let voteInfo = this.voteInfos[this.index];
        this.displayedInfos = this.voteInfos.slice(0, this.index + 2);
        this.slideOpts.initialSlide = this.displayedInfos.indexOf(voteInfo);
        void this.getDPoSV1Data();
        void this.getCRCandidateData();
        void this.getCRCouncilData();
        void this.getProposalData();

        // Logger.log(App.STAKING, 'displayedInfos', this.displayedInfos);
        // Logger.log(App.STAKING, 'index', this.index);
    }

    //// Increment nodes array when sliding forward ////
    loadNext() {
        let lastNode: any = this.displayedInfos.slice(-1)[0];
        let nextNodeIndex: number = this.voteInfos.indexOf(lastNode) + 1;
        if (this.voteInfos[nextNodeIndex]) {
            this.displayedInfos.push(this.voteInfos[nextNodeIndex]);
        } else {
            return;
        }
        Logger.log('dposvoting', 'last node', lastNode);
        Logger.log('dposvoting', 'next node', this.voteInfos[nextNodeIndex]);
    }

    async getDPoSV1Data() {
        if (this.voteInfos[VoteType.DPoSV1].list.length > 0) {
            const param = {
                method: 'listproducers',
                params: {
                    state: "all"
                },
            };


            let rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
            try {
                const result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);

                if (result && !Util.isEmptyObject(result.producers)) {
                    Logger.log(App.STAKING, "dposlist:", result.producers);
                    for (const node of result.producers) {
                        for (const item of this.voteInfos[VoteType.DPoSV1].list) {
                            if (item.candidate == node.ownerpublickey && (!node.identity || node.identity != "DPoSV2")) {
                                item.name = node.nickname;
                                item.id = item.candidate;
                            }
                        }
                    }
                }

            } catch (err) {
                Logger.error(App.STAKING, 'fetchNodes error:', err);
            }
        }
        this.voteInfos[VoteType.DPoSV1].dataFetched = true;
    }

    async getCRCouncilData() {
        Logger.log(App.CRCOUNCIL_VOTING, 'Fetching CRMembers..');

        if (this.voteInfos[VoteType.CRImpeachment].list.length > 0) {
            const param = {
                method: 'listcurrentcrs',
                params: {
                    state: "all"
                },
            };


            let rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
            try {
                const result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);

                if (result && !Util.isEmptyObject(result.crmembersinfo)) {
                    Logger.log(App.STAKING, "crcouncil:", result.crmembersinfo);
                    for (const member of result.crmembersinfo) {
                        for (const item of this.voteInfos[VoteType.CRImpeachment].list) {
                            if (item.candidate == member.cid) {
                                item.name = member.nickname;
                                item.id = member.did;
                                item.idLabel = "DID";
                            }

                        }
                    }
                }

            } catch (err) {
                Logger.error(App.STAKING, 'fetchCRMembers error:', err);
            }
        }
        this.voteInfos[VoteType.CRImpeachment].dataFetched = true;
    }


    async getCRCandidateData() {
        Logger.log(App.STAKING, 'Fetching Candidates..');

        if (this.voteInfos[VoteType.CRCouncil].list.length > 0) {
            const param = {
                method: 'listcrcandidates',
                params: {
                    state: "all"
                },
            };

            let rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
            try {
                const result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);

                if (result && !Util.isEmptyObject(result.crcandidatesinfo)) {
                    Logger.log(App.STAKING, "crcandidates:", result.crcandidatesinfo);
                    for (const candidate of result.crcandidatesinfo) {
                        for (const item of this.voteInfos[VoteType.CRCouncil].list) {
                            if (item.candidate == candidate.cid) {
                                item.name = candidate.nickname;
                                item.id = candidate.did;
                                item.idLabel = "DID";
                            }
                        }
                    }
                }

            } catch (err) {
                Logger.error(App.STAKING, 'fetchCRMembers error:', err);
            }
        }
        this.voteInfos[VoteType.CRCouncil].dataFetched = true;
    }

    async getProposalData() {
        for (const item of this.voteInfos[VoteType.CRProposal].list) {
            let proposal = await this.proposalService.fetchProposalDetails(item.candidate);
            if (proposal) {
                item.name = '#' + proposal.id + ' ' + proposal.title;
                item.id = item.candidate;
                item.idLabel = "staking.proposal-hash";
            }

        }
        this.voteInfos[VoteType.CRProposal].dataFetched = true;
    }

}

