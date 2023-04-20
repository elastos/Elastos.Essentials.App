import { Injectable, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { ElastosApiUrlType, GlobalElastosAPIService, NodeType } from 'src/app/services/global.elastosapi.service';
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

    public voteStakeExpired30: string = null;
    public voteStakeAboutExpire: string = null;
    public myNodeStakeExpired30: string = null;
    public myNodeStakeAboutExpire: string = null;

    public updateInfo: any;

    // Stats
    public statsFetched = false;
    public currentHeight = 0;
    public mainchain: Mainchain;
    public voters: Voters;
    public price: Price;
    public block: Block;

    // Empty List - Used to loop dummy items while data is being fetched
    public emptyList = new Array(20).fill('');
    private initOngoning = false;

    // Storage
    public lastVotes = [];

    // Fetch
    private logoUrl = 'https://api.elastos.io/images/';

    //Votes
    public minStakeDays = 10;
    public myVotes = [];

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

        try {
            await this.getStoredVotes();
            await this.fetchNodes();
            await this.geMyVoteds();
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
                }
            }
        }
    }

    async fetchStats() {
        try {
            let widgetsApi = GlobalElastosAPIService.instance.getApiUrl(ElastosApiUrlType.WIDGETS);
            let result = await this.globalJsonRPCService.httpGet(widgetsApi);
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
        let currentHeight = await GlobalElastosAPIService.instance.getCurrentHeight();
        // let currentBlockTimestamp = await this.voteService.getBlockByHeight(currentHeight);
        let currentBlockTimestamp = moment().valueOf() / 1000;
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

        this.activeNodes = [];
        this.dposList = [];
        this.voteStakeExpired30 = null;
        this.voteStakeAboutExpire = null;
        this.myNodeStakeExpired30 = null;
        this.myNodeStakeAboutExpire = null;
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
                    }

                    if (!node.identity || node.identity && node.identity == "DPoSV1") {
                        continue;
                    }

                    node.index += 1;

                    if (node.state === 'Active' || (node.state === 'Inactive')) {
                        //Check stake Until
                        let until = node.stakeuntil - currentHeight;
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
                            if (!node.checkDisabled && this.lastVotes.indexOf(node.ownerpublickey) != -1) {
                                node.isChecked = true;
                            }
                        }

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
        const result = await await GlobalElastosAPIService.instance.getRawTransaction(txid);
        if (result && result.confirmations) {
            return result.confirmations;
        }

        return -1;
    }

    async geMyVoteds(): Promise<any[]> {
        var stakeAddress = await this.voteService.sourceSubwallet.getOwnerStakeAddress()
        Logger.log(App.DPOS2, 'getOwnerStakeAddress', stakeAddress);
        let currentHeight = await GlobalElastosAPIService.instance.getCurrentHeight();
        // let currentBlockTimestamp = await this.voteService.getBlockByHeight(currentHeight);
        let currentBlockTimestamp = moment().valueOf() / 1000;

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
                            stakeuntil: node.stakeuntil,
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
                        else if (locktime <= 15) {
                            item.stakeuntilAboutExpire = this.translate.instant('dposvoting.about-to-expire');
                        }
                        else {
                            item.stakeuntilExpiredIn = await this.voteService.getRemainingTimeString(locktime);
                        }

                        if (locktime < expired30) { //less than 30 days
                            expired30 = locktime;
                        }

                        this.myVotes.push(item);
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

        return this.myVotes;
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
        const result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
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
        switch (node.nickname) {
            case '韩锋/SunnyFengHan':
                node.imageUrl = this.logoUrl + 'Sunny_Feng_Han_min.png';
                node.Location = 'United States';
                break;
            case 'Enter Elastos':
                node.imageUrl = 'assets/dposvoting/supernodes/enterelastos.png';
                node.Location = 'Germany';
                break;
            case 'EverlastingOS':
                node.imageUrl = 'assets/dposvoting/supernodes/everlastingos.png';
                node.Location = 'Netherlands';
                break;
            case 'SmartWeb_Nenchy/能奇':
                node.imageUrl = 'assets/dposvoting/supernodes/nenchy.jpeg';
                node.Location = 'Slovenia';
                break;
            case "MButcho's Guard":
                node.imageUrl = 'assets/dposvoting/supernodes/mbutchos-guard.png';
                node.Location = 'Slovenia';
                break;
            case "Elastos Digerati - 亦来云视角":
                node.imageUrl = 'assets/dposvoting/supernodes/digerati.png';
                node.Location = 'Philippines';
                break;
            case "Elastos Scotland":
                node.imageUrl = 'assets/dposvoting/supernodes/elastos-scotland.jpg';
                node.Location = 'Scotland';
                break;
            case "Elastos SVK":
                node.imageUrl = 'assets/dposvoting/supernodes/elastos-svk.jpg';
                node.Location = 'Germany';
                break;
            case "ELA巅峰见":
                node.imageUrl = 'assets/dposvoting/supernodes/ela-peak.png';
                node.Location = 'China';
                break;
            case "RealWeb3":
                node.imageUrl = 'assets/dposvoting/supernodes/RealWeb3.jpg';
                node.Location = 'Scotland';
                break;
            case "sheepshaun":
                node.imageUrl = 'assets/dposvoting/supernodes/shaun.jpg';
                node.Location = 'Germany';
                break;
            case "Wild Strawberry Atlas":
                node.imageUrl = 'assets/dposvoting/supernodes/wildstrawberryatlas.jpg';
                node.Location = 'United States';
                break;
            case "Wild Strawberry Calypso":
                node.imageUrl = 'assets/dposvoting/supernodes/calipso.jpg';
                node.Location = 'United States';
                break;
            case "Wild Strawberry Apollo":
                node.imageUrl = 'assets/dposvoting/supernodes/apollo.jpg';
                node.Location = 'United States';
                break;
            case "Godzilla_Germany":
                node.imageUrl = 'assets/dposvoting/supernodes/godzilla-germany.jpg';
                node.Location = 'Germany';
                break;
            case "tyro":
                node.imageUrl = 'assets/dposvoting/supernodes/tyro.jpg';
                node.Location = 'China';
                break;
            case "Plutela":
                node.imageUrl = 'assets/dposvoting/supernodes/plutela.jpg';
                node.Location = 'Germany';
                break;
            case "相信ELASTOS":
                node.imageUrl = 'assets/dposvoting/supernodes/elastos.jpg';
                node.Location = 'Germany';
                break;
            case "ZCO.CO":
                node.imageUrl = 'assets/dposvoting/supernodes/ZCO.CO.png';
                node.Location = 'Hong Kong';
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
        return this.uxService.toThousands(votes);
    }
}
