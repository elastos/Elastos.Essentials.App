import { Injectable, NgZone } from '@angular/core';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { VoteService } from 'src/app/voting/services/vote.service';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { RawTransactionType, TransactionStatus } from 'src/app/wallet/model/tx-providers/transaction.types';
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

    public stakeExpired30: string = null;
    public myStakeExpired30: string = null;

    public updateInfo: any;

    // Stats
    public statsFetched = false;
    public currentHeight = 0;
    public mainchain: Mainchain;
    public voters: Voters;
    public price: Price;
    public block: Block;

    // Empty List - Used to loop dummy items while data is being fetched
    public emptyList = [];

    private initOngoning = false;

    // Storage
    public lastVotes = [];

    // Fetch
    private logoUrl = 'https://api.elastos.io/images/';

    //Votes
    public myVotes = [];

    public onlyUpdateStakeUntil = false;

    constructor(
        public stakeService: StakeService,
        public uxService: UXService,
        private storage: GlobalStorageService,
        private globalIntentService: GlobalIntentService,
        private globalJsonRPCService: GlobalJsonRPCService,
        private globalElastosAPIService: GlobalElastosAPIService,
        public voteService: VoteService,
        public popupProvider: GlobalPopupService,
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
        Logger.log("dposvoting", "Initializing the nodes service");

        if (!this.voteService.needFetchData[App.DPOS2]) return;

        if (this.initOngoning) return;

        this.initOngoning = true;
        for (let i = 0; i < 20; i++) {
            this.emptyList.push('');
        }

        try {
            await this.fetchNodes();
            await this.geMyVoteds();
        }
        catch (err) {
            Logger.warn('dposvoting', 'Initialize node error:', err)
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
        if (!await this.voteService.checkBalanceForRegistration()) {
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
                }
            }
        }
    }

    async fetchStats() {
        try {
            let result = await this.globalJsonRPCService.httpGet('https://api-testnet.elastos.io/widgets');
            if (result) {
                this.statsFetched = true;
                this.mainchain = result.mainchain;
                this.voters = result.voters;
                this.price = result.price;
                this.block = result.block;
            }
        } catch (err) {
            Logger.error('dposvoting', 'fetchStats error:', err);
        }
    }

    async fetchNodes() {
        var ownerPublicKey = '';
        let currentHeight = await this.voteService.getCurrentHeight();
        let currentBlockTimestamp = await this.voteService.getBlockByHeight(currentHeight);
        await this.stakeService.getVoteRights();

        //The wallet imported by private key has no ELA subwallet.
        if (this.voteService.networkWallet.hasSubWallet(StandardCoinName.ELA)) {
            ownerPublicKey = this.voteService.sourceSubwallet.getOwnerPublicKey();
        }
        this.dposInfo = {
            nickname: "",
            location: 0,
            url: '',

            state: "Unregistered",
            nodepublickey: ownerPublicKey,
            ownerpublickey: ownerPublicKey,
        };

        //Get ower dpos info
        const param = {
            method: 'listproducers',
            params: {
                state: "all"
            },
        };

        this.activeNodes = [];
        this.dposList = [];
        this.stakeExpired30 = null;
        this.myStakeExpired30 = null;
        if (!this.lastVotes) {
            this.lastVotes = [];
        }

        let rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
        try {
            const result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
            Logger.log(App.DPOS2, "result:", result);

            if (result && !Util.isEmptyObject(result.producers)) {
                this.totalVotes = result.totaldposv2votes;
                this._nodes = result.producers;

                for (const node of result.producers) {
                    if (node.ownerpublickey == ownerPublicKey) {
                        this.dposInfo = node;
                    }

                    if (!node.identity || node.identity && node.identity == "DPoSV1") {
                        continue;
                    }

                    node.index += 1;

                    if (node.state === 'Active' || (node.state === 'Inactive')) {
                        if (node.state === 'Active') {
                            this.activeNodes.push(node);
                            if (this.lastVotes.indexOf(node.ownerpublickey) != -1) {
                                node.isChecked = true;
                            }
                        }

                        //Check stake Until
                        var until = node.stakeuntil - currentHeight;
                        node.stakeDays = Math.ceil(until / 720);
                        if (until > 720 * 7) { //more than 7 days
                            var stakeTimestamp = until * 120 + currentBlockTimestamp
                            node.stakeuntilDate = this.uxService.formatDate(stakeTimestamp);
                        }
                        else {
                            node.stakeuntilExpired = await this.voteService.getRemainingTimeString(until);
                        }

                        if ((until < 720 * 30) && (node == this.dposInfo)) { //less than 30 days
                            this.myStakeExpired30 = await this.voteService.getRemainingTimeString(until);
                        }

                        // //get votes precentage
                        // node.myVotesPrecentage = 0;
                        // if (this.stakeService.votesRight.totalVotesRight > 0) {
                        //     let list = this.stakeService.votesRight.voteInfos[VoteType.DPoSV2].list;
                        //     let votes = 0;
                        //     for (let i in list) {
                        //         if (node.ownerpublickey == list[i].candidate) {
                        //             votes += parseFloat(list[i].votes);
                        //         }
                        //     }
                        //     node.myVotesPrecentage = this.uxService.getPercentage(votes, this.stakeService.votesRight.totalVotesRight);
                        // }

                        //get node precentage
                        node.votesPrecentage = this.uxService.getPercentage(node.dposv2votes, this.totalVotes);

                        this.dposList.push(node);
                    }

                    this.getNodeIcon(node);
                }

                Logger.log('dposvoting', 'Active Nodes..', this.activeNodes);
                // this.setupRewardInfo();
            }

        } catch (err) {
            Logger.error('dposvoting', 'fetchNodes error:', err);
            await this.popupProvider.ionicAlert('common.error', 'dposvoting.dpos-node-info-no-available');
        }

        await this.checkTxConfirm();
    }

    async getConfirmCount(txid: string): Promise<number> {
        //Get ower dpos info
        const param = {
            method: 'getrawtransaction',
            params: {
                txid: txid,
                verbose: true
            },
        };

        let rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
        const result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
        if (result && result.confirmations) {
            return result.confirmations;
        }

        return -1;
    }

    async geMyVoteds(): Promise<any[]> {
        var stakeAddress = await this.voteService.sourceSubwallet.getOwnerStakeAddress()
        Logger.log(App.DPOS2, 'getOwnerStakeAddress', stakeAddress);
        let currentHeight = await this.voteService.getCurrentHeight();
        let currentBlockTimestamp = await this.voteService.getBlockByHeight(currentHeight);

        const param = {
            method: 'getalldetaileddposv2votes',
            params: {
                stakeaddress: stakeAddress,
            },
        };

        this.myVotes = [];
        let rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
        const result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
        Logger.log(App.DPOS2, 'getalldetaileddposv2votes', result);
        if (result) {
            var index = 0;
            var expired30 = 720 * 30;
            for (const vote of result) {
                for (const node of this.activeNodes) {
                    if (vote.producerownerkey ==  node.ownerpublickey) {
                        let locktime = vote.info.locktime - currentHeight;
                        var item =  {
                            index: index++,
                            imageUrl: node.imageUrl,
                            nickname: node.nickname,
                            Location: node.Location,
                            referkey: vote.referkey,
                            candidate: vote.info.candidate,
                            votes: vote.info.votes,
                            locktime: vote.info.locktime,
                            lockDays: Math.ceil(locktime / 720),
                        } as any;
                        item.inputStakeDays = item.lockDays;

                        if (locktime > 720 * 7) { //more than 7 days
                            var stakeTimestamp = locktime * 120 + currentBlockTimestamp
                            item.stakeuntilDate = this.uxService.formatDate(stakeTimestamp);
                        }
                        else {
                            item.stakeuntilExpired = await this.voteService.getRemainingTimeString(locktime);
                        }

                        if (locktime < expired30) { //less than 30 days
                            expired30 = locktime;
                        }

                        this.myVotes.push(item);
                    }
                }
            }

            if (expired30 < 720 * 30) {
                this.stakeExpired30 = await this.voteService.getRemainingTimeString(expired30);
            }
        }

        return this.myVotes;
    }

    getNodeIcon(node: DPoS2Node) {
        switch (node.nickname) {
            case '韩锋/SunnyFengHan':
                node.imageUrl = this.logoUrl + 'Sunny_Feng_Han_min.png';
                node.Location = 'United States';
                break;
            case 'Elephant Wallet':
                node.imageUrl = 'https://api.elastos.io/images/elephant-wallet.png';
                node.Location = 'Singapore';
                break;
            case 'Elastos Scandinavia':
                node.imageUrl = 'https://api.elastos.io/images/Scandinavia.png';
                node.Location = 'Sweden';
                break;
            case 'Wild Strawberries Atlas':
                node.imageUrl = 'https://i.ibb.co/qDdmLQJ/EPpf-VIMW4-AIx-J30.jpg';
                node.Location = 'United States';
                break;
            case 'Wild Strawberries Apollo':
                node.imageUrl = 'https://i.ibb.co/F7L83NH/EPpf-VIa-Wk-AAUM3d.jpg';
                node.Location = 'Ireland';
                break;
            case 'WeFilmchain':
                node.imageUrl = 'https://api.elastos.io/images/wefilmchain.png';
                node.Location = 'Canada';
                break;
            case 'Elastos HIVE':
                node.imageUrl = 'https://api.elastos.io/images/Hive.png';
                node.Location = 'Hong Kong';
                break;
            case 'Wild Strawberries Calypso':
                node.imageUrl = 'https://i.ibb.co/ZfCj6Yj/EPpf-VJGXs-AEq0-X1.jpg';
                node.Location = 'Brazil';
                break;
            case 'Elate.ch':
                node.imageUrl = 'https://api.elastos.io/images/ELATE.CH.png';
                node.Location = 'Switzerland';
                break;
            case 'ThaiEla':
                node.imageUrl = 'https://i.ibb.co/qF16Mgn/download-1.png';
                node.Location = 'Thailand';
                break;
            case 'Elastos Carrier':
                node.imageUrl = 'https://api.elastos.io/images/Carrier.png';
                node.Location = 'Hong Kong';
                break;
            case 'ELA News (ELA新闻)':
                node.imageUrl = 'https://api.elastos.io/images/ELA_News.png';
                node.Location = 'South Africa';
                break;
            case 'elafans':
                node.imageUrl = 'https://api.elastos.io/images/ELA_Fans.png';
                node.Location = 'Singapore';
                break;
            case 'Witzer（无智）':
                node.imageUrl = 'https://api.elastos.io/images/Witzer.png';
                node.Location = 'China';
                break;
            case 'ElastosDMA':
                node.imageUrl = 'https://api.elastos.io/images/Elastos_DMA_min.png';
                node.Location = 'United States';
                break;
            case 'Starfish':
                node.imageUrl = 'https://api.elastos.io/images/Starfish.png';
                node.Location = 'United States';
                break;
            case 'greengang':
                node.imageUrl = 'https://api.elastos.io/images/Greengang.png';
                node.Location = 'China';
                break;
            case 'Elastos Australia':
                node.imageUrl = 'https://api.elastos.io/images/Elastos_Australia.png';
                node.Location = 'Australia';
                break;
            case 'DACA区块链技术公开课':
                node.imageUrl = 'https://i.ibb.co/jRdhF7L/download-2.png';
                node.Location = 'China';
                break;
            case 'KuCoin':
                node.imageUrl = 'https://api.elastos.io/images/KuCoin.png';
                node.Location = 'China';
                break;
            case 'IOEX(ioeX Network)':
                node.imageUrl = 'https://api.elastos.io/images/IOEX.png';
                node.Location = 'Hong Kong';
                break;
            case 'Antpool-ELA':
                node.imageUrl = 'https://api.elastos.io/images/Antpool.png';
                node.Location = 'Brazil';
                break;
            case 'CR Herald | CR 先锋资讯':
                node.imageUrl = 'https://api.elastos.io/images/CR_Herald.png';
                node.Location = 'China';
                break;
            case '曲率区动':
                node.imageUrl = 'https://api.elastos.io/images/Curvature_Zone.png';
                node.Location = 'China';
                break;
            case 'F2Pool':
                node.imageUrl = 'https://api.elastos.io/images/F2Pool.png';
                node.Location = 'China';
                break;
            case 'BTC.com':
                node.imageUrl = 'https://i.ibb.co/0sddwC5/download.jpg';
                node.Location = 'China';
                break;
            case 'ELA.SYDNEY':
                node.Location = 'Australia';
                break;
            case 'ManhattanProjectFund':
                node.Location = 'United States';
                break;
            case 'Elastos Blockchain':
                node.Location = 'China';
                break;
            case 'llamamama':
                node.Location = 'South Korea';
                break;
            case 'Dragonela':
            case 'Dragonela 2.0':
                node.imageUrl = 'https://api.elastos.io/images/dragonela.png';
                node.Location = 'United States';
                break;
            case 'Glide':
                node.imageUrl = 'https://api.elastos.io/images/Glide.png';
                node.Location = 'United States';
                break;
            case 'ElaboxSN1':
                node.imageUrl = 'assets/dposvoting/supernodes/elabox.png';
                node.Location = 'France';
                break;
            case 'ElaboxSN2':
                node.imageUrl = 'assets/dposvoting/supernodes/elabox.png';
                node.Location = 'Malta';
                break;
            case 'Elastos.info':
                node.imageUrl = 'https://api.elastos.io/images/Elastos.info.png';
                node.Location = 'Japan';
                break;
        }

        if (node.state !== 'Active') {
            node.Location = 'Inactive';
        }
    }

    getVotes(votes: string): string {
        const fixedVotes: number = parseFloat(votes);
        return fixedVotes.toLocaleString().split(/\s/).join(',');
    }

}
