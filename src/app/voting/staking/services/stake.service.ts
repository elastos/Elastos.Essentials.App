import { Injectable, NgZone } from '@angular/core';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { Config } from 'src/app/wallet/config/Config';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { UXService } from '../../services/ux.service';

export enum VoteType {
    DPoSV1 = 0,
    CRCouncil = 1,
    CRProposal = 2,
    CRImpeachment = 3,
    DPoSV2 = 4,
}

export type VotesRight = {
    totalVotesRight: number;
    maxStaked: number;
    maxStakedRatio: number;
    minRemainVoteRight: number;
    dpos2LockTimeDate?: number;
    dpos2LockTimeExpired?: number;
    voteInfos?: any[];
    votes?: number[];
    remainVotes?: number[];
}

export type RewardInfo = {
    claimable: number;
    claiming: number;
    claimed: number;
    total: number;
}

@Injectable({
    providedIn: 'root'
})
export class StakeService {

    public votesRight = {
        totalVotesRight: 0,
        maxStaked: 0,
        maxStakedRatio: 0,
        minRemainVoteRight: 0,

    } as VotesRight;

    public rewardInfo = {
        claimable: 0,
        claiming: 0,
        claimed: 0,
        total: 0,
    } as RewardInfo;

    public firstAddress: string;

    constructor(
        public uxService: UXService,
        private globalJsonRPCService: GlobalJsonRPCService,
        private globalElastosAPIService: GlobalElastosAPIService,
        public voteService: VoteService,
        public popupProvider: GlobalPopupService,
        public events: GlobalEvents,
        public zone: NgZone,
    ) {

    }

    async initData() {
        this.firstAddress = this.voteService.sourceSubwallet.getCurrentReceiverAddress();
        this.votesRight = await this.getVoteRights();
        this.rewardInfo = await this.getRewardInfo();
    }

    public async getBalanceByAddress(address: string, spendable = false): Promise<number> {
        let addressArray = [address];
        try {
            const balanceList = await this.voteService.sourceSubwallet.callGetBalanceByAddress(StandardCoinName.ELA, addressArray, spendable);
            Logger.log(App.STAKING, 'getBalanceByAddress balance:', balanceList.value);
            let balance = balanceList.value;
            if (!balance.isNegative()) {
                return Math.floor(balance.dividedBy(Config.SELAAsBigNumber).toNumber());
            }
        } catch (e) {
            Logger.error(App.STAKING, 'jsonRPCService.getBalanceByAddress exception:', e);
            throw e;
        }
        return -1;
    }

    public getBalanceByFirstAddress(spendable = false): Promise<number> {
        return this.getBalanceByAddress(this.firstAddress);
    }

    async getVoteRights(): Promise<VotesRight> {
        var stakeAddress = await this.voteService.sourceSubwallet.getOwnerStakeAddress()
        Logger.log(App.DPOS_VOTING, 'getOwnerStakeAddress', stakeAddress);

        this.votesRight = {
            totalVotesRight: 0,
            maxStaked: 0,
            maxStakedRatio: 0,
            minRemainVoteRight: 0,
            votes: [],
            remainVotes: [],
            voteInfos: [],
        } as VotesRight;

        const param = {
            method: 'getvoterights',
            params: {
                stakeaddresses: [stakeAddress],
            },
        };

        let rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
        const result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
        Logger.log(App.DPOS_VOTING, 'getvoterights', result);
        if (result && result[0] && result[0].totalvotesright) {
            this.votesRight.totalVotesRight = Number.parseInt(result[0].totalvotesright);

            if (this.votesRight.totalVotesRight > 0) {
                if (result[0].remainvoteright) {
                    let arr = this.uxService.stringArrayToNumberArray(result[0].remainvoteright);
                    if (arr.length > 0) {
                        let min = Math.min(...arr);
                        this.votesRight.maxStaked = this.votesRight.totalVotesRight - min;
                        this.votesRight.maxStakedRatio = Math.floor(this.votesRight.maxStaked / this.votesRight.totalVotesRight * 10000) / 100;
                        this.votesRight.minRemainVoteRight = min;
                        this.votesRight.remainVotes = arr;
                        for (let i in arr) {
                            this.votesRight.votes.push(this.votesRight.totalVotesRight - arr[i]);
                        }
                    }
                }

                //Handle usedvotesinfo
                if (result[0].usedvotesinfo) {
                    let dposv2votes = result[0].usedvotesinfo.useddposv2votes;
                    if (dposv2votes) {
                        var locktime = Number.MAX_SAFE_INTEGER;
                        for (let i in dposv2votes) {
                            if (dposv2votes[i].Info[0].locktime < locktime) {
                                locktime = dposv2votes[i].Info[0].locktime;
                            }
                        }
                        if (locktime != Number.MAX_SAFE_INTEGER) {
                            let ret = await this.getStakeUntil(locktime);
                            if (ret.date) {
                                this.votesRight.dpos2LockTimeDate = ret.date;
                            }
                            else {
                                this.votesRight.dpos2LockTimeExpired = ret.expired;
                            }
                        }
                    }

                    this.votesRight.voteInfos = [];
                    this.votesRight.voteInfos.push({ index: 0, title: "DPoS 1.0", list: result[0].usedvotesinfo.useddposvotes });
                    this.votesRight.voteInfos.push({ index: 1, title: "staking.cr-council", list: result[0].usedvotesinfo.usedcrvotes });
                    this.votesRight.voteInfos.push({ index: 2, title: "staking.cr-proposal", list: result[0].usedvotesinfo.usedcrcproposalvotes });
                    this.votesRight.voteInfos.push({ index: 3, title: "staking.cr-impeachment", list: result[0].usedvotesinfo.usdedcrimpeachmentvotes });
                }
            }
        }

        return this.votesRight;
    }

    async getRewardInfo(): Promise<RewardInfo> {

        this.rewardInfo = {
            claimable: 0,
            claiming: 0,
            claimed: 0,
            total: 0,
        } as RewardInfo

        const param = {
            method: 'dposv2rewardinfo',
            params: {
                address: this.firstAddress,
            },
        };

        let rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
        const result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
        Logger.log(App.DPOS_VOTING, 'dposv2rewardinfo', result);
        if (result) {
            if (result.claimable) {
                this.rewardInfo.claimable = Number.parseInt(result.claimable);
            }

            if (result.claiming) {
                this.rewardInfo.claiming = Number.parseInt(result.claiming);
            }

            if (result.claimed) {
                this.rewardInfo.claimed = Number.parseInt(result.claimed);
            }

            this.rewardInfo.total = this.rewardInfo.claimable + this.rewardInfo.claiming + this.rewardInfo.claimed;
        }

        return this.rewardInfo;
    }

    async getStakeUntil(stakeUntil: number, currentHeight?: number, currentBlockTimestamp?: number): Promise<any> {
        if (!currentHeight) {
            currentHeight = await this.voteService.getCurrentHeight();
            currentBlockTimestamp = await this.voteService.getBlockByHeight(currentHeight);
        }
        var until = stakeUntil - currentHeight;
        if (until > 720 * 7) { //more than 7 days
            var stakeTimestamp = until * 120 + currentBlockTimestamp
            return { date: this.uxService.formatDate(stakeTimestamp) };
        }
        else {
            return { expired: await this.voteService.getRemainingTimeString(until) };
        }
    }
}
