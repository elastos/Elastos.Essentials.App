import { Injectable, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { ElastosApiUrlType, GlobalElastosAPIService, ImageInfo, NodeType } from 'src/app/services/global.elastosapi.service';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { VoteService } from 'src/app/voting/services/vote.service';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { RawTransactionType, TransactionStatus, Utxo, UtxoType } from 'src/app/wallet/model/tx-providers/transaction.types';
import { UXService } from '../../services/ux.service';
import { StakeService } from '../../staking/services/stake.service';
import { DPoS2Node } from '../model/nodes.model';
import { Block, Mainchain, Price, Voters } from '../model/stats.model';

export type DPoS2RegistrationInfo = {
    active?: boolean;
    cancelheight?: number;
    illegalheight?: number;
    inactiveheight?: number;
    index?: number;
    location?: number;
    nickname?: string;
    nodepublickey?: string;
    ownerpublickey?: string;
    registerheight?: number;
    state: string;
    url?: string;
    votes?: string;
    txConfirm?: boolean; // For after register and update info, the transaction don't confirm

    stakeuntil?: number;
    stakeDays?: number;
    inputStakeDays?: number;

    identity?: string;
}

export type VotesInfo = {
    timestamp: number,
    stakeAddress: string,
    votes: any[]
}

@Injectable({
    providedIn: 'root'
})
export class DPoS2Service {

    //Registration
    public dposInfo: DPoS2RegistrationInfo;

    // Nodes
    public _nodes: DPoS2Node[] = [];
    public activeNodes: DPoS2Node[] = [];
    public totalVotes = 0;
    public dposList: DPoS2Node[] = [];
    private fetchNodesTimestamp = 0;
    private fetchNodesOwnerPublicKey = '';

    // Image
    private nodeImages: ImageInfo[] = [];

    public voteStakeExpired30: string = null;
    public voteStakeAboutExpire: string = null;
    public myNodeStakeExpired30: string = null;
    public myNodeStakeAboutExpire: string = null;

    public nodePublicKeyNotSet: string = null;

    public updateInfo: any;

    // Stats
    public statsFetched = false;
    public currentHeight = 0;
    public mainchain: Mainchain;
    public voters: Voters;
    public price: Price;
    public block: Block;
    private fetchStatsTimestamp = 0;

    // Empty List - Used to loop dummy items while data is being fetched
    public emptyList = new Array(10).fill('');
    private initOngoning = false;

    // Storage
    public lastVotes = [];

    // Fetch
    private logoUrl = 'https://api.elastos.io/images/';

    //Votes
    public minStakeDays = 10;

    public myVotes: VotesInfo[] = [];
    private isFetchingMyvotes = false;

    public onlyUpdateStakeUntil = false;

    constructor(
        public stakeService: StakeService,
        public uxService: UXService,
        private storage: GlobalStorageService,
        public translate: TranslateService,
        private globalJsonRPCService: GlobalJsonRPCService,
        private globalElastosAPIService: GlobalElastosAPIService,
        public voteService: VoteService,
        public popupProvider: GlobalPopupService,
        private globalNative: GlobalNativeService,
        public events: GlobalEvents,
        public zone: NgZone,
    ) {

    }

    get nodes(): DPoS2Node[] {
        return [...this._nodes.filter((a, b) => this._nodes.indexOf(a) === b)];
    }

    getNode(id: string): DPoS2Node {
        return { ...this._nodes.find(node => node.nodepublickey === id) };
    }

    async init() {
        Logger.log(App.DPOS2, "Initializing the nodes service");

        if (!this.voteService.needFetchData[App.DPOS2]) return;

        if (this.initOngoning) return;
        this.initOngoning = true;

        if (this.voteService.isMuiltWallet()) {
            this.minStakeDays = 11;
        }
        else {
            this.minStakeDays = 10;
        }

        this.logoUrl = GlobalElastosAPIService.instance.getApiUrl(ElastosApiUrlType.IMAGES) + '/';

        try {
            await this.getStoredVotes();
            await this.fetchNodeAvatars();
            await this.fetchNodes();
            this.updateSelectedNode()
            // For faster startup, don't get my votes on init.
            // await this.geMyVoteds();
        }
        catch (err) {
            Logger.warn('dposvoting', 'Initialize node error:', err);
            await this.voteService.popupErrorMessage(err, App.DPOS2);

        }
        this.initOngoning = false;

        this.voteService.needFetchData[App.DPOS2] = false;
    }

    async getStoredVotes() {
        this.lastVotes = [];

        await this.storage.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, 'dpos2', this.voteService.masterWalletId + '-votes', []).then(data => {
            if (data) {
                // filter invalid votes.
                this.lastVotes = data;
                Logger.log(App.DPOS2, 'lastVotes', this.lastVotes);
            }
        });
    }

    async setStoredVotes(keys) {
        this.lastVotes = keys;
        Logger.log(App.DPOS2, 'lastVotes updated', this.lastVotes);
        await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "dpos2", this.voteService.masterWalletId + '-votes', this.lastVotes);
    }

    async checkBalanceForRegDposNode(): Promise<boolean> {
        if (!await this.voteService.checkBalanceForRegistration(this.voteService.deposit2K)) {
            await this.popupProvider.ionicAlert('wallet.insufficient-balance', 'dposvoting.reg-dpos-balance-not-enough');
            return false;
        }
        return true;
    }

    async checkTxConfirm() {
        this.dposInfo.txConfirm = true;
        if (this.voteService.sourceSubwallet) {
            // TODO await this.voteService.sourceSubwallet.getTransactionsByRpc();
            let txhistory = await this.voteService.sourceSubwallet.getTransactions();
            for (let i in txhistory) {
                if (txhistory[i].Status !== TransactionStatus.CONFIRMED) {
                    if (this.dposInfo.state == 'Unregistered') {
                        if (txhistory[i].txtype == RawTransactionType.RegisterProducer) {
                            this.dposInfo.txConfirm = false;
                            break;
                        }
                    }
                    else if (txhistory[i].txtype == RawTransactionType.UpdateProducer) {
                        this.dposInfo.txConfirm = false;
                        break;
                    }
                } else {
                    break;
                }
            }
        }
    }

    async fetchNodeAvatars() {
      try {
          let result = await GlobalElastosAPIService.instance.fetchImages();
          if (result) {
              this.nodeImages = result;
          }
      } catch (err) {
          Logger.error('dposvoting', 'fetchNodeAvatars error:', err);
      }
    }

    async fetchStats() {
        let currentBlockTimestamp = moment().valueOf() / 1000;
        if (this.fetchStatsTimestamp + 120 >= currentBlockTimestamp) {
            return;
        }

        try {
            let widgetsApi = GlobalElastosAPIService.instance.getApiUrl(ElastosApiUrlType.WIDGETS);
            let result = await this.globalJsonRPCService.httpGet(widgetsApi);
            if (result) {
                this.statsFetched = true;
                this.mainchain = result.mainchain;
                this.voters = result.voters;
                this.price = result.price;
                this.block = result.block;

                this.fetchStatsTimestamp = currentBlockTimestamp;
            }
        } catch (err) {
            Logger.error('dposvoting', 'fetchStats error:', err);
        }
    }

    async fetchNodes() {
        let ownerPublicKey = '';
        //The wallet imported by private key has no ELA subwallet.
        if (this.voteService.networkWallet.hasSubWallet(StandardCoinName.ELA)) {
            ownerPublicKey = this.voteService.sourceSubwallet.getOwnerPublicKey();
        }

        let currentBlockTimestamp = moment().valueOf() / 1000;
        if ((this.fetchNodesOwnerPublicKey == ownerPublicKey) && (this.fetchNodesTimestamp + 120 >= currentBlockTimestamp)) {
            return;
        }

        this.currentHeight = await GlobalElastosAPIService.instance.getCurrentHeight();

        // await this.stakeService.getVoteRights();

        this.dposInfo = {
            nickname: "",
            location: 0,
            url: '',

            state: "Unregistered",
            nodepublickey: ownerPublicKey,
            ownerpublickey: ownerPublicKey,
        };

        this.activeNodes = [];
        this.dposList = [];
        this.voteStakeExpired30 = null;
        this.voteStakeAboutExpire = null;
        this.myNodeStakeExpired30 = null;
        this.myNodeStakeAboutExpire = null;
        this.nodePublicKeyNotSet = null;
        if (!this.lastVotes) {
            this.lastVotes = [];
        }

        try {
            const result = await GlobalElastosAPIService.instance.fetchDposNodes('all', NodeType.BPoS);
            Logger.log(App.DPOS2, "result:", result);

            if (result && !Util.isEmptyObject(result.producers)) {
                this.totalVotes = parseFloat(result.totaldposv2votes);
                this._nodes = result.producers as DPoS2Node[];

                for (const node of this._nodes) {
                    if (node.ownerpublickey == ownerPublicKey) {
                        this.dposInfo = node;

                        if (node.ownerpublickey == node.nodepublickey) {
                            this.nodePublicKeyNotSet = this.translate.instant('dposvoting.node-unbind');
                        }
                    }

                    if (!node.identity || node.identity && node.identity == "DPoSV1") {
                        continue;
                    }

                    node.index += 1;

                    if (node.state === 'Active' || (node.state === 'Inactive')) {
                        //Check stake Until
                        let until = node.stakeuntil - this.currentHeight;
                        node.stakeDays = Math.ceil(until / 720);
                        if (until > 720 * 7) { //more than 7 days
                            var stakeTimestamp = until * 120 + currentBlockTimestamp
                            node.stakeuntilDate = this.uxService.formatDate(stakeTimestamp);
                        }
                        else if (until <= 15) {
                            node.stakeuntilAboutExpire = this.translate.instant('dposvoting.about-to-expire');
                        }
                        else {
                            node.stakeuntilExpiredIn = await this.voteService.getRemainingTimeString(until);
                        }

                        if ((until < 720 * 30) && (node == this.dposInfo)) { //less than 30 days
                            if (until <= 15) {
                                this.myNodeStakeAboutExpire = this.translate.instant('dposvoting.node-about-exprie');
                            }
                            else {
                                this.myNodeStakeExpired30 = await this.voteService.getRemainingTimeString(until);
                            }
                        }

                        // //get votes percentage
                        // node.myVotesPercentage = 0;
                        // if (this.stakeService.votesRight.totalVotesRight > 0) {
                        //     let list = this.stakeService.votesRight.voteInfos[VoteType.DPoSV2].list;
                        //     let votes = 0;
                        //     for (let i in list) {
                        //         if (node.ownerpublickey == list[i].candidate) {
                        //             votes += parseFloat(list[i].votes);
                        //         }
                        //     }
                        //     node.myVotesPercentage = this.uxService.getPercentage(votes, this.stakeService.votesRight.totalVotesRight);
                        // }

                        node.dposv2votesNumber = parseFloat(node.dposv2votes);

                        //get node percentage
                        node.votesPercentage = this.uxService.getPercentage(node.dposv2votesNumber, this.totalVotes);

                        node.checkDisabled = node.state === 'Inactive' || until < this.minStakeDays * 720;

                        if (node.state === 'Active') {
                            this.activeNodes.push(node);
                        }

                        this.dposList.push(node);
                    }

                    this.getNodeIcon(node);
                }

                Logger.log('dposvoting', 'Active Nodes..', this.activeNodes);
                this.fetchNodesTimestamp = currentBlockTimestamp;
                this.fetchNodesOwnerPublicKey = ownerPublicKey;
                // this.setupRewardInfo();
            }

        } catch (err) {
            Logger.error('dposvoting', 'fetchNodes error:', err);
            await this.popupProvider.ionicAlert('common.error', 'dposvoting.dpos-node-info-no-available');
        }

        await this.checkTxConfirm();
    }

    async checkDPoSStatus() {
      var ownerPublicKey = '';

      //The wallet imported by private key has no ELA subwallet.
      if (this.voteService.networkWallet.hasSubWallet(StandardCoinName.ELA)) {
          ownerPublicKey = this.voteService.sourceSubwallet.getOwnerPublicKey();
      }

      try {
          const result = await GlobalElastosAPIService.instance.fetchDposNodes('all', NodeType.DPoS);
          Logger.log(App.DPOS2, "result:", result);

          if (result && !Util.isEmptyObject(result.producers)) {
              for (const node of result.producers) {
                  if (node.ownerpublickey == ownerPublicKey) {
                      this.dposInfo = node;
                      return node;
                  }
              }
          }

      } catch (err) {
          Logger.error('dposvoting', 'checkDPoSStatus error:', err);
          await this.popupProvider.ionicAlert('common.error', 'dposvoting.dpos-node-info-no-available');
      }

      return null;
  }

    // After switching wallets, fetchNodes may not be executed, but voting records need to be updated.
    updateSelectedNode() {
        for (const node of this._nodes) {
            if (node.state === 'Active') {
                if (!node.checkDisabled && this.lastVotes.indexOf(node.ownerpublickey) != -1) {
                    node.isChecked = true;
                } else {
                  node.isChecked = false;
                }
            }
        }
    }

    async getConfirmCount(txid: string): Promise<number> {
        //Get ower dpos info
        const result = await await GlobalElastosAPIService.instance.getRawTransaction(txid);
        if (result && result.confirmations) {
            return result.confirmations;
        }

        return -1;
    }

    async geMyVoteds(): Promise<any[]> {
        var stakeAddress = await this.voteService.sourceSubwallet.getOwnerStakeAddress()
        let currentTimestamp = moment().valueOf() / 1000;
        if (this.myVotes[stakeAddress] && (this.myVotes[stakeAddress].timestamp + 120 >= currentTimestamp)) {
            return this.myVotes[stakeAddress].votes;
        } else {
            if (this.isFetchingMyvotes) return [];

            this.isFetchingMyvotes = true;
            try {
                return await this.fetchMyVoteds();
            }
            catch (e) {
                Logger.log(App.DPOS2, 'fetch my voteds exception:', e);
            }
            finally {
                this.isFetchingMyvotes = false;
            }
        }
    }

    async fetchMyVoteds(): Promise<any[]> {
        var stakeAddress = await this.voteService.sourceSubwallet.getOwnerStakeAddress()
        Logger.log(App.DPOS2, 'getOwnerStakeAddress', stakeAddress);
        this.currentHeight = await GlobalElastosAPIService.instance.getCurrentHeight();
        let currentBlockTimestamp = moment().valueOf() / 1000;

        const param = {
            method: 'getalldetaileddposv2votes',
            params: {
                stakeaddress: stakeAddress,
            },
        };

        this.myVotes[stakeAddress] = {timestamp : 0, votes : []}

        let rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
        const result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param, 'default', 10000, false, true);
        Logger.log(App.DPOS2, 'getalldetaileddposv2votes', result);
        if (result) {
            var index = 0;
            var expired30 = 720 * 30;
            for (const vote of result) {
                for (const node of this.activeNodes) {
                    if (vote.producerownerkey ==  node.ownerpublickey) {
                        let locktime = vote.info.locktime - this.currentHeight;
                        var item =  {
                            index: index++,
                            imageUrl: node.imageUrl,
                            nickname: node.nickname,
                            Location: node.Location,
                            stakeuntil: node.stakeuntil,
                            referkey: vote.referkey,
                            candidate: vote.info.candidate,
                            votes: vote.info.votes,
                            locktime: vote.info.locktime,
                            lockDays: Math.ceil(locktime / 720),
                            nodeStakeDays: node.stakeDays,
                            voteRights: vote.DPoSV2VoteRights,
                            blockheight: vote.blockheight, // The block height of start pledging.
                        } as any;
                        item.inputStakeDays = item.lockDays;

                        if (locktime > 720 * 7) { //more than 7 days
                            var stakeTimestamp = locktime * 120 + currentBlockTimestamp
                            item.stakeuntilDate = this.uxService.formatDate(stakeTimestamp);
                        }
                        else if (locktime <= 15) {
                            item.stakeuntilAboutExpire = this.translate.instant('dposvoting.about-to-expire');
                        }
                        else {
                            item.stakeuntilExpiredIn = await this.voteService.getRemainingTimeString(locktime);
                        }

                        if (locktime < expired30) { //less than 30 days
                            expired30 = locktime;
                        }

                        this.myVotes[stakeAddress].votes.push(item);
                    }
                }
            }

            if (expired30 < 720 * 30) {
                if (expired30 <= 15) {
                    this.voteStakeAboutExpire = this.translate.instant('dposvoting.vote-about-exprie');
                }
                else {
                    this.voteStakeExpired30 = await this.voteService.getRemainingTimeString(expired30);
                }
            }
        }
        this.myVotes[stakeAddress].timestamp = currentBlockTimestamp;
        return this.myVotes[stakeAddress].votes;
    }

    async getDepositcoin(): Promise<number> {
        var  available = 0;
        const param = {
            method: 'getdepositcoin',
            params: {
                ownerpublickey: this.dposInfo.ownerpublickey,
            },
        };
        let rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
        const result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param, 'default', 10000, false, true);
        Logger.log(App.DPOS2, "getdepositcoin:", result);
        if (!Util.isEmptyObject(result.available)) {
            available = result.available;
            Logger.log(App.DPOS2, "available:", available);
        }
        return available;
    }


    async retrieve(available: number) {
        Logger.log(App.DPOS2, 'Calling retrieve()', this.dposInfo);

        if (!await this.voteService.checkWalletAvailableForVote()) {
            return;
        }

        try {
            await this.globalNative.showLoading(this.translate.instant('common.please-wait'));

            let depositAddress = await this.voteService.sourceSubwallet.getOwnerDepositAddress();
            let utxoArray = await GlobalElastosAPIService.instance.getAllUtxoByAddress(StandardCoinName.ELA, [depositAddress], UtxoType.Normal) as Utxo[];
            Logger.log(App.DPOS2, "utxoArray:", utxoArray);

            let utxo = await this.voteService.sourceSubwallet.getUtxoForSDK(utxoArray);

            const rawTx = await this.voteService.sourceSubwallet.createRetrieveDepositTransaction(utxo, available, "");
            await this.globalNative.hideLoading();

            let ret = await this.voteService.signAndSendRawTransaction(rawTx);
            if (ret) {
                this.voteService.toastSuccessfully('dposvoting.retrieve');
            }
        }
        catch (err) {
            await this.globalNative.hideLoading();
            // await this.voteService.popupErrorMessage(err, App.DPOS2);
        }
    }

    getNodeIcon(node: DPoS2Node) {
        // Logger.warn(App.DPOS2, 'Node', node);
        if (this.nodeImages[node.ownerpublickey] && this.nodeImages[node.ownerpublickey].logo) {
            node.imageUrl = this.logoUrl + this.nodeImages[node.ownerpublickey].logo;
            return;
        }
    }

    getVotes(votes: string): string {
        return this.uxService.toThousands(votes);
    }

    public isFetchingData() {
      return this.initOngoning || this.isFetchingMyvotes;
  }
}
