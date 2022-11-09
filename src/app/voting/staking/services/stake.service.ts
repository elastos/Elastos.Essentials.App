import { Injectable, NgZone } from '@angular/core';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
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

    public rewardInfo: RewardInfo;
    public nodeRewardInfo: RewardInfo;
    public totalRewardInfo: RewardInfo;

    public firstAddress: string;
    public ownerAddress: string;
    public ownerDpos2 = false;
    public ownerPublicKey = '';

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

        if (!this.voteService.needFetchData[App.STAKING]) return;

        this.firstAddress = this.voteService.sourceSubwallet.getCurrentReceiverAddress();
        this.ownerPublicKey = this.voteService.sourceSubwallet.getOwnerPublicKey();
        this.ownerAddress = this.voteService.sourceSubwallet.getOwnerAddress();

        await this.checkOwnerDpos2();
        this.votesRight = await this.getVoteRights();
        this.rewardInfo = await this.getRewardInfo(this.firstAddress);
        if (this.ownerDpos2 && this.firstAddress != this.ownerAddress) {
            this.totalRewardInfo = Util.clone(this.rewardInfo);
            let rewardInfo = await this.getRewardInfo(this.ownerAddress);
            this.totalRewardInfo.claimable += rewardInfo.claimable;
            this.totalRewardInfo.claiming += rewardInfo.claiming;
            this.totalRewardInfo.claimed += rewardInfo.claimed;
            this.totalRewardInfo.total += rewardInfo.total;
            this.nodeRewardInfo = rewardInfo;
        }
        else {
            this.totalRewardInfo = this.rewardInfo;
        }

        this.voteService.needFetchData[App.STAKING] = false;
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

        const result = await this.globalElastosAPIService.getVoteRights(stakeAddress);
        Logger.log(App.DPOS_VOTING, 'getvoterights', result);
        if (result && result[0] && result[0].totalvotesright) {
            this.votesRight.totalVotesRight = Number.parseInt(result[0].totalvotesright);

            if (this.votesRight.totalVotesRight > 0) {
                if (result[0].remainvoteright) {
                    let arr = this.uxService.stringArrayToNumberArray(result[0].remainvoteright);
                    if (arr.length > 0) {
                        let dposvotes = result[0].usedvotesinfo.useddposvotes;
                        var min = 0;
                        if (dposvotes.length > 0) {
                            min = Math.min(...arr);
                        }
                        else {
                            min = Math.min(...(arr.slice(1, 5)));
                        }
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
                    let dpos2List = []
                    if (dposv2votes) {
                        var locktime = Number.MAX_SAFE_INTEGER;
                        for (let i in dposv2votes) {
                            for (let j in dposv2votes[i].Info) {
                                if (dposv2votes[i].Info[j].locktime < locktime) {
                                    locktime = dposv2votes[i].Info[j].locktime;
                                }
                                dpos2List.push(dposv2votes[i].Info[j])
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
                    this.votesRight.voteInfos.push({ index: 4, title: "DPoS 2.0", list: dpos2List });
                }
            }
        }

        return this.votesRight;
    }

    async getRewardInfo(address: string): Promise<RewardInfo> {

        var rewardInfo = {
            claimable: 0,
            claiming: 0,
            claimed: 0,
            total: 0,
        } as RewardInfo

        const param = {
            method: 'dposv2rewardinfo',
            params: {
                address: address,
            },
        };

        let rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
        const result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
        Logger.log(App.DPOS_VOTING, 'dposv2rewardinfo', result);
        if (result) {
            if (result.claimable) {
                rewardInfo.claimable = Number.parseInt(result.claimable);
            }

            if (result.claiming) {
                rewardInfo.claiming = Number.parseInt(result.claiming);
            }

            if (result.claimed) {
                rewardInfo.claimed = Number.parseInt(result.claimed);
            }

            rewardInfo.total = rewardInfo.claimable + rewardInfo.claiming + rewardInfo.claimed;
        }

        return rewardInfo;
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

    async checkOwnerDpos2() {


        //Get ower dpos info
        const param = {
            method: 'listproducers',
            params: {
                state: "all"
            },
        };

        this.ownerDpos2 = false;

        let rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
        try {
            const result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);

            if (result && !Util.isEmptyObject(result.producers)) {
                Logger.log(App.DPOS_VOTING, "dposlist:", result.producers);

                for (const node of result.producers) {
                    if (node.ownerpublickey == this.ownerPublicKey) {
                        this.ownerDpos2 = true;
                        return;
                    }
                }
            }
        } catch (err) {
            Logger.error(App.STAKING, 'checkOwnerDpos2 error:', err);
            await this.popupProvider.ionicAlert('common.error', 'dposvoting.dpos-node-info-no-available');
        }
    }
}
