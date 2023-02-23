import { Injectable, NgZone } from '@angular/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { VoteService } from 'src/app/voting/services/vote.service';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { RawTransactionType, TransactionStatus } from 'src/app/wallet/model/tx-providers/transaction.types';
import { Vote } from '../model/history.model';
import { DPosNode } from '../model/nodes.model';
import { Block, Mainchain, Price, Voters } from '../model/stats.model';
import { DIDSessionsStore } from './../../../services/stores/didsessions.store';

export type DPoSRegistrationInfo = {
    active?: boolean;
    cancelheight?: number;
    illegalheight?: number;
    inactiveheight?: number;
    index?: number;
    location?: number;
    nickname?: string;
    nodepublickey?: string;
    ownerpublickey?: string;
    registerheight?: 113;
    state: string;
    url?: string;
    votes?: string;
    txConfirm?: boolean; // For after register and update info, the transaction don't confirm

    identity?: string;
}

@Injectable({
    providedIn: 'root'
})
export class NodesService {

    //Registration
    public dposInfo: DPoSRegistrationInfo;

    // Nodes
    public _nodes: DPosNode[] = [];
    public activeNodes: DPosNode[] = [];
    public totalVotes = 0;
    public dposList: DPosNode[] = [];

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
    private firstVisit = false;
    public _votes: Vote[] = [
        /*{
            date: new Date(2000,10,13,11,33,0),
            tx: 'a2677487ba6c406f70b22c6902b3b2ffe582f99b58848bbfba9127c5fa47c712',
            keys: [
                '0368044f3b3582000597d40c9293ea894237a88b2cd55f79a18193399937d22664',
                '03d55285f06683c9e5c6b5892a688affd046940c7161571611ea3a98330f72459f',
                '024b527700491895b79fc5bfde8a60395307c5416a075503e6ac7d1df61c971c78'
            ]
        },
        {
            date: new Date(),
            tx: 'd42da61ad9d12e0adf167d9451506cc119ad6384cae6d57158e643192720cf10',
            keys: [
                '03674a7867f2d4a557764d1f61138b9f98542c9a77e8773953432ac3e48ae60226',
                '02d6f8ff72eaa9aada515d6b316cff2cbc55be09ddab17981d74a585ae20617a72',
                '02a85be1f6244b40b8778b626bde33e1d666b3b5863f195487e72dc0e2a6af33a1'
            ]
        },
        {
            date: new Date(79,5,24,11,33,0),
            tx: '241315309c645e52fabafe9e8963037829f025526b9b616972b8b7a0965e6ac4',
            keys: [
                '026c8ce246d2587df8a669eee82be4f365ab6cf4fc45e3e539cf0ab91fbab3a809',
                '0315067144eaad471ed0c355e6f9822c51b93308e0cd9febf0792304c605973916',
                '030cda9b67897652dbf9f85cb0aba39a09203004f59366517a5461b1e48d9faa64',
                '02b6052f5f65089be3b94efb91c98a5f94c0bf7fbefdbd85c1d547aa7b3d547710'
            ]
        }*/
    ];

    // Fetch
    private nodeApi = 'https://node1.elaphant.app/api/';
    private logoUrl = 'https://api.elastos.io/images/';

    // This is too slow, so call once.
    private isFetchingRewardOrDone = false;
    private rewardResult: any = null;

    constructor(
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

    get nodes(): DPosNode[] {
        return [...this._nodes.filter((a, b) => this._nodes.indexOf(a) === b)];
    }

    getNode(id: string): DPosNode {
        return { ...this._nodes.find(node => node.nodepublickey === id) };
    }

    getVote(id: string): Vote {
        return { ...this._votes.find(vote => vote.tx === id) };
    }

    async init() {
        Logger.log("dposvoting", "Initializing the nodes service");
        if (this.initOngoning) return;

        this.initOngoning = true;
        for (let i = 0; i < 20; i++) {
            this.emptyList.push('');
        }

        try {
            // await this.getVisit();
            await this.getStoredVotes();
            await this.fetchNodes();
        }
        catch (err) {
            Logger.warn('dposvoting', 'Initialize node error:', err)
        }
        this.initOngoning = false;

        if (!this.isFetchingRewardOrDone) {
            this.isFetchingRewardOrDone = true
            // Too slow, don't await
            void this.fetchReward();
        }
    }

    // Titlebar
    setTitlebar(titleBar: TitleBarComponent) {
        titleBar.setBackgroundColor("#A25BFE");
        titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
        titleBar.setTitle('DPoS Voting');
    }

    // Storage
    getVisit() {
        void this.storage.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, 'dposvoting', 'visited', false).then(data => {
            if (data || data === true) {
                this.firstVisit = false;
            }
        });
    }

    sortVotes() {
        this._votes.sort((a, b) => {
            if (b.date > a.date)
                return 1;
            else
                return -1;
        });
    }

    async getStoredVotes() {
        this._votes = [];

        await this.storage.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, 'dposvoting', this.voteService.masterWalletId + '-votes', []).then(data => {
            if (data && data.length > 0) {
                // filter invalid votes.
                this._votes = data.filter(c => { return c.tx; });
                this.sortVotes();
                Logger.log('dposvoting', 'Vote history', this._votes);
            }
        });
    }

    async setStoredVotes() {
        this.sortVotes();
        Logger.log('dposvoting', 'Vote history updated', this._votes);
        await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "dposvoting", this.voteService.masterWalletId + '-votes', this._votes);
    }

    // getStoredNodes() {
    //     this.storage.getSetting(DIDSessionsStore.signedInDIDString, 'dposvoting', 'nodes', []).then(data => {
    //         Logger.log('dposvoting', data);
    //         this._nodes.map(node => {
    //             if (data && data.includes(node.ownerpublickey) && node.state === 'Active') {
    //                 node.isChecked = true;
    //             }
    //         });
    //     });
    // }

    async checkBalanceForRegDposNode(): Promise<boolean> {
        if (!await this.voteService.checkBalanceForRegistration(this.voteService.deposit5K)) {
            await this.popupProvider.ionicAlert('wallet.insufficient-balance', 'dposregistration.reg-dpos-balance-not-enough');
            return false;
        }
        return true;
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
        var vote: Vote = null;
        if (this._votes.length > 0) {
            vote = this._votes[0];
        }

        let rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
        try {
            const result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);

            if (result && !Util.isEmptyObject(result.producers)) {
                Logger.log(App.DPOS_VOTING, "dposlist:", result.producers);
                this.totalVotes = result.totalvotes;
                this._nodes = result.producers;
                for (const node of result.producers) {
                    if (node.identity && node.identity == "DPoSV2") {
                        continue;
                    }

                    if (node.ownerpublickey == ownerPublicKey) {
                        this.dposInfo = node;
                    }
                    node.index += 1;

                    if (node.state === 'Active' || (node.state === 'Inactive')) {
                        if (node.state === 'Active') {
                            this.activeNodes.push(node);
                            if ((vote != null) && (vote.keys.indexOf(node.ownerpublickey) != -1)) {
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

    async fetchCurrentHeight(): Promise<number> {
        Logger.log('dposvoting', 'Fetching height');
        try {
            let result = await this.globalJsonRPCService.httpGet(this.nodeApi + '1/currHeight');
            if (result) {
                this.currentHeight = result.result;
            }
        } catch (err) {
            Logger.error('dposvoting', 'fetchStats error:', err);
        }

        return this.currentHeight;
    }

    async fetchReward() {
        Logger.log('dposvoting', 'start fetchReward');
        try {
            const height: number = await this.fetchCurrentHeight();
            // this api is too slow.
            let result = await this.globalJsonRPCService.httpGet(this.nodeApi + 'v1/dpos/rank/height/' + height + '?state=active');
            if (result) {
                this.rewardResult = result.result;
                this.setupRewardInfo();
            } else {
                this.isFetchingRewardOrDone = false;
            }
        } catch (err) {
            this.isFetchingRewardOrDone = false;
            Logger.error('dposvoting', 'fetchStats error:', err);
        }
    }

    setupRewardInfo() {
        if (this.rewardResult === null || this.activeNodes === null) return;

        this.rewardResult.forEach(element => {
            let index = this.activeNodes.findIndex(e => e.ownerpublickey === element.Ownerpublickey);
            if (this.activeNodes[index]) {
                this.activeNodes[index].Reward = element.Reward;
                this.activeNodes[index].EstRewardPerYear = element.EstRewardPerYear;
            }
        });
    }

    /* getNodeIcon() {
      this._nodes.map(node => {
        if (node.Url && node.state === 'Active') {
          this.http.get<any>(node.Url + '/bpinfo.json').subscribe(responce => {
            node.imageUrl = responce.org.branding.logo_256;
            node.Location = responce.org.location.country;
          },
          error => {
            Logger.log('dposvoting', 'DPosNode does not have extra data', error);
          });
        }
      });
    } */

    getNodeIcon(node: DPosNode) {
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

    openLink(url: string) {
        void this.globalIntentService.sendIntent('openurl', { url: url });
    }
}
