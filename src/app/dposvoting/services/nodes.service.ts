import { Injectable, NgZone } from '@angular/core';

import { DPosNode } from '../model/nodes.model';
import { Vote } from '../model/history.model';
import { Mainchain, Voters, Price, Block } from '../model/stats.model';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { WalletJsonRPCService } from 'src/app/wallet/services/jsonrpc.service';
import { VoteService } from 'src/app/vote/services/vote.service';
import { WalletManager } from 'src/app/wallet/services/wallet.service';
import { Util } from 'src/app/model/util';
import { App } from 'src/app/model/app.enum';
import { StandardCoinName } from 'src/app/wallet/model/Coin';
import { PopupProvider } from 'src/app/services/global.popup.service';
import { TransactionStatus, RawTransactionType } from 'src/app/wallet/model/Transaction';
import { Events } from 'src/app/services/events.service';


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
    public totalVotes: number = 0;
    public dposList: DPoSRegistrationInfo[] = [];

    // Stats
    public statsFetched: boolean = false;
    public currentHeight: number = 0;
    public mainchain: Mainchain;
    public voters: Voters;
    public price: Price;
    public block: Block;

    // Empty List - Used to loop dummy items while data is being fetched
    public emptyList = [];

    // Storage
    private firstVisit: boolean = false;
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
    private nodeApi: string = 'https://node1.elaphant.app/api/';
    private elaNodeUrl: string = 'https://elanodes.com/wp-content/uploads/custom/images/';

    // This is too slow, so call once.
    private isFetchingRewardOrDone = false;
    private rewardResult: any = null;

    constructor(
        private storage: GlobalStorageService,
        private globalIntentService: GlobalIntentService,
        private globalJsonRPCService: GlobalJsonRPCService,
        private globalElastosAPIService: GlobalElastosAPIService,
        public walletRPCService: WalletJsonRPCService,
        public voteService: VoteService,
        private walletManager: WalletManager,
        public popupProvider: PopupProvider,
        public events: Events,
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

        for (let i = 0; i < 20; i++) {
            this.emptyList.push('');
        }

        // await this.getVisit();
        await this.getStoredVotes();
        await this.fetchStats();
        await this.fetchNodes();
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
        this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, 'dposvoting', 'visited', false).then(data => {
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
        await this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, 'dposvoting', this.voteService.masterWalletId + '-votes', []).then(data => {
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
        await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "dposvoting", this.voteService.masterWalletId + '-votes', this._votes);
    }

    // getStoredNodes() {
    //     this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, 'dposvoting', 'nodes', []).then(data => {
    //         Logger.log('dposvoting', data);
    //         this._nodes.map(node => {
    //             if (data && data.includes(node.ownerpublickey) && node.state === 'Active') {
    //                 node.isChecked = true;
    //             }
    //         });
    //     });
    // }

    async checkBalanceForRegDposNode(): Promise<boolean> {
        let depositAmount = 50000000000; // 5000 ELA
        let fee = 10000;
        let amount = depositAmount + fee;
        if (this.voteService.sourceSubwallet.balance.lt(amount)) {
            await this.popupProvider.ionicAlert('wallet.insufficient-balance', 'dposregistration.reg-dpos-balance-not-enough');
            return false;
        }
        return true;
    }

    async fetchStats() {
        try {
            let result = await this.globalJsonRPCService.httpGet('https://elanodes.com/api/widgets');
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
        let ownerPublicKey = await this.walletManager.spvBridge.getOwnerPublicKey(this.voteService.masterWalletId, StandardCoinName.ELA);
        this.dposInfo = {
            nickname: "test",
            location: 86,
            url: 'http://test.com',

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
                this.dposList = result.producers;
                this.totalVotes = result.totalvotes;
                this._nodes = result.producers;
                for (const node of result.producers) {
                    if (node.ownerpublickey == ownerPublicKey) {
                        this.dposInfo = node;
                    }
                    node.index += 1;
                    if (node.state === 'Active') {
                        this.activeNodes.push(node);
                    }
                    if (vote != null && vote.keys.includes(node.ownerpublickey)) {
                        node.isChecked = true;
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
        await this.voteService.sourceSubwallet.getTransactionByRPC();
        let txhistory = this.voteService.sourceSubwallet.transactions.txhistory;
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
                node.imageUrl = this.elaNodeUrl + 'Sunny_Feng_Han_min.png';
                node.Location = 'United States';
                break;
            case 'Elephant Wallet':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/elephant-wallet.png';
                node.Location = 'Singapore';
                break;
            case 'Elastos Scandinavia':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Scandinavia.png';
                node.Location = 'Sweden';
                break;
            case 'AnyPeer':
                node.imageUrl = 'https://i.ibb.co/hcVLkJP/download.png';
                node.Location = 'Hong Kong';
                break;
            case 'Wild Strawberries Atlas':
                node.imageUrl = 'https://i.ibb.co/qDdmLQJ/EPpf-VIMW4-AIx-J30.jpg';
                node.Location = 'United States';
                break;
            case 'Enter Elastos - Ganymede':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Enter%20Elastos.png';
                node.Location = 'Australia';
                break;
            case 'Wild Strawberries Apollo':
                node.imageUrl = 'https://i.ibb.co/F7L83NH/EPpf-VIa-Wk-AAUM3d.jpg';
                node.Location = 'Ireland';
                break;
            case 'Enter Elastos -Callisto':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Enter%20Elastos.png';
                node.Location = 'United States';
                break;
            case 'TYROLEE(小黑狼)':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/TyroLee.png';
                node.Location = 'China';
                break;
            case 'Hyper':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/hyperim-logo.png';
                node.Location = 'Austria';
                break;
            case 'WeFilmchain':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/wefilmchain.png';
                node.Location = 'Canada';
                break;
            case 'Elastos HIVE':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Hive.png';
                node.Location = 'Hong Kong';
                break;
            case 'Wild Strawberries Calypso':
                node.imageUrl = 'https://i.ibb.co/ZfCj6Yj/EPpf-VJGXs-AEq0-X1.jpg';
                node.Location = 'Brazil';
                break;
            case 'Enter Elastos - Titan ':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Enter%20Elastos.png';
                node.Location = 'United Kingdom';
                break;
            case 'Noderators - Watermelon':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Noderators.png';
                node.Location = 'India';
                break;
            case 'Elate.ch':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ELATE.CH.png';
                node.Location = 'Switzerland';
                break;
            case 'ThaiEla':
                node.imageUrl = 'https://i.ibb.co/qF16Mgn/download-1.png';
                node.Location = 'Thailand';
                break;
            case 'Elastos Carrier':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Carrier.png';
                node.Location = 'Hong Kong';
                break;
            case 'Cyber Republic Press CR新闻团队':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Cyber%20Republic%20Press3_min.png';
                node.Location = 'United States';
                break;
            case 'Elastos Forest Node (EFN)':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Elaforestnode.png';
                node.Location = 'Netherlands';
                break;
            case 'ELA News (ELA新闻)':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ELA%20News2.png';
                node.Location = 'South Africa';
                break;
            case 'Elastos News':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ELA%20News2.png';
                node.Location = 'South Africa';
                break;
            case 'elafans':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ELA%20Fans.png';
                node.Location = 'Singapore';
                break;
            case 'elaHorse @ 亦乐马':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ELAHORSE1.png';
                node.Location = 'Malaysia';
                break;
            case 'Witzer（无智）':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Witzer1.png';
                node.Location = 'China';
                break;
            case '无智(Witzer)':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Witzer1.png';
                node.Location = 'China';
                break;
            case 'ElastosDMA':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Elastos%20DMA_min.png';
                node.Location = 'United States';
                break;
            case 'ELAONSEN 亦来温泉':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ELAONSEN.png';
                node.Location = 'Hong Kong';
                break;
            case 'Starfish':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Starfish.png';
                node.Location = 'United States';
                break;
            case 'greengang':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Greengang1.png';
                node.Location = 'China';
                break;
            case 'Elastos Australia':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Elastos%20Australia1.png';
                node.Location = 'Australia';
                break;
            case 'DACA区块链技术公开课':
                node.imageUrl = 'https://i.ibb.co/jRdhF7L/download-2.png';
                node.Location = 'China';
                break;
            case 'RUOLAN(若兰)':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Roulon1.png';
                node.Location = 'China';
                break;
            case 'RUOLAN节点':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Roulon1.png';
                node.Location = 'China';
                break;
            case 'The Houston Supernode':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Houston-Supernode2_min.png';
                node.Location = 'United States';
                break;
            case 'Cheery Community':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/CheeryCommunity1_min.png';
                node.Location = 'Australia';
                break;
            case 'KuCoin':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/KuCoin.png';
                node.Location = 'China';
                break;
            case 'Noderators - Champagne':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Noderators.png';
                node.Location = 'United States';
                break;
            case 'Noderators - Jazz':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Noderators.png';
                node.Location = 'United States';
                break;
            case 'Quantum Wealth Supernode':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Quantum%20Wealth%20Supernode.png';
                node.Location = 'United States';
                break;
            case 'Northern Lights':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Northern%20Lights.png';
                node.Location = 'Russia';
                break;
            case '链世界':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Blockchain_World_1.png';
                node.Location = 'China';
                break;
            case 'HashWorld':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/HashWorld.png';
                node.Location = 'China';
                break;
            case 'IOEX(ioeX Network)':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ioeX2.png';
                node.Location = 'Hong Kong';
                break;
            case 'Antpool-ELA':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Antpool.png';
                node.Location = 'Brazil';
                break;
            case 'Black Swan':
                node.imageUrl = 'https://i.ibb.co/yq6z86Y/thumbnail.png';
                node.Location = 'Czech Republic';
                break;
            case 'DHG(大黄哥)':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/DHG2.png';
                node.Location = 'China';
                break;
            case 'DHG':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/DHG2.png';
                node.Location = 'China';
                break;
            case 'CR Regions Global Fund - Clarence Liu':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Cyber%20Republic%20Regions.png';
                node.Location = 'United States';
                break;
            case 'CR Herald | CR 先锋资讯':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/CR%20Herald.png';
                node.Location = 'China';
                break;
            case 'BitWork (CR Region HK)':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/BitWork_1.png';
                node.Location = 'Hong Kong';
                break;
            case 'YDiot(云端物联）':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/YDiot.png';
                node.Location = 'China';
                break;
            case '曲率区动':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Curvature_Zone.png';
                node.Location = 'China';
                break;
            case '区块链研习社':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Chainclub.png';
                node.Location = 'China';
                break;
            case 'BIT.GAME':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/BIT.GAME.png';
                node.Location = 'China';
                break;
            case 'F2Pool':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/F2Pool.png';
                node.Location = 'China';
                break;
            case 'BTC.com':
                node.imageUrl = 'https://i.ibb.co/0sddwC5/download.jpg';
                node.Location = 'China';
                break;
            case 'ELAFISH':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ELAFISH_1.png';
                node.Location = 'Canada';
                break;
            case 'NextGenius':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Next%20Genius.png';
                node.Location = 'Australia';
                break;
            case 'ElaChat':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ELAChat.png';
                node.Location = 'China';
                break;
            case 'AIoTV(视九TVbox)':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ShijuiTV.png';
                node.Location = 'China';
                break;
            case '比特头条BITETT ':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Bitett.png';
                node.Location = 'China';
                break;
            case 'ELAlliance 大水瓢':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ELAlliance.png';
                node.Location = 'China';
                break;
            case 'Long ELA，Short the world(追风筝的人)':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Crypto_World1.png';
                node.Location = 'Germany';
                break;
            case 'StorSwift (Elastos HIVE)':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/StorSwift.png';
                node.Location = 'China';
                break;
            case 'viewchain':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/viewchain.png';
                node.Location = 'Singapore';
                break;
            case 'Famous Amos':
                node.imageUrl = 'https://i.imgur.com/cHRF2Ov.jpg';
                node.Location = 'Trinidad';
                break;
            case 'eladapp.org':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/eladapp.png'
                node.Location = 'United States';
                break;
            case 'ELA.SYDNEY':
                node.Location = 'Australia';
                break;
            case 'Orion Supernode':
                node.Location = 'France';
                break;
            case 'Elastos Contributors':
                node.Location = 'Japan';
                break;
            case 'Ela-Mao':
                node.Location = 'China';
                break;
            case 'ManhattanProjectFund':
                node.Location = 'United States';
                break;
            case '河北社区':
                node.Location = 'China';
                break;
            case 'ELA.GOLD':
                node.Location = 'Switzerland';
                break;
            case 'Orchard - Elastos Business Development':
                node.Location = 'Netherlands'
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Orchard.png';;
                break;
            case 'KANG':
                node.Location = 'China';
                break;
            case '虎哥':
                node.Location = 'China';
                break;
            case '亦来力-ELAPower':
                node.Location = 'China';
                break;
            case 'ELA new internet':
                node.Location = 'Pitcairn Islands';
                break;
            case 'To the Moon':
                node.Location = 'China';
                break;
            case 'Cape of Good Hope':
                node.Location = 'South Africa';
                break;
            case 'ELABay':
                node.Location = 'Canada';
                break;
            case 'BOHUI':
                node.Location = 'China';
                break;
            case '云上':
                node.Location = 'China';
                break;
            case 'Elastos Blockchain':
                node.Location = 'China';
                break;
            case 'HicKs乡巴佬':
                node.Location = 'China';
                break;
            case 'llamamama':
                node.Location = 'United States';
                break;
            case 'The land of abundance':
                node.Location = 'China';
                break;
            case '韭菜必赢WE WILL WIN':
                node.Location = 'China';
                break;
            case '文亦':
                node.Location = 'China';
                break;
            case 'silence':
                node.Location = 'China';
                break;
            case 'The future is coming 未来亦来':
                node.Location = 'China';
                break;
            case 'Ken.Tan':
                node.Location = 'China';
                break;
            case 'Nights Watch 守夜人':
                node.Location = 'China';
                break;
            case '米（粒）力联盟':
                node.Location = 'China';
                break;
            case 'ela':
                node.Location = 'China';
                break;
            case '我爱云':
                node.Location = 'China';
                break;
            case '群山':
                node.Location = 'China';
                break;
            case 'ELADAO':
                node.Location = 'China';
                break;
            case '币.天下':
                node.Location = 'China';
                break;
            case 'cryptocalnews':
                node.Location = 'Canada';
                break;
            case 'Blockchain007':
                node.Location = 'China';
                break;
            case 'Dragonela':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/dragonela.png';
                node.Location = 'United States';
                break;
            case 'Daily Rewards':
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Daily_Rewards.png';
                node.Location = 'Japan';
                break;
            case 'United Kingdom':
                node.imageUrl = 'https://cdn.pixabay.com/photo/2015/11/06/13/29/union-jack-1027898_1280.jpg';
                node.Location = 'United Kingdom';
                break;
            case 'ELA2020':
                node.Location = 'China';
                break;
            case 'RichMan':
                node.Location = 'Canada';
                break;
            case 'Good Luck':
                node.Location = 'Canada';
                break;
            case 'ElaHome':
                node.Location = 'Canada';
                break;
            case 'CloudSea':
                node.Location = 'Canada'
        }

        if (node.state !== 'Active') {
            node.Location = 'Inactive';
        }
    }

    openLink(url: string) {
        this.globalIntentService.sendIntent('openurl', { url: url });
    }
}
