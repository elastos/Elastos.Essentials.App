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
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { VoteService } from 'src/app/voting/services/vote.service';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { RawTransactionType, TransactionStatus } from 'src/app/wallet/model/tx-providers/transaction.types';
import { UXService } from '../../services/ux.service';
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

    public needRefreshNodes = true;


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
    private elaNodeUrl = 'https://elanodes.com/wp-content/uploads/custom/images/';

    constructor(
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
        if (this.initOngoning) return;

        this.initOngoning = true;
        for (let i = 0; i < 20; i++) {
            this.emptyList.push('');
        }

        try {
            await this.fetchNodes();
        }
        catch (err) {
            Logger.warn('dposvoting', 'Initialize node error:', err)
        }
        this.initOngoning = false;
    }

    // Titlebar
    setTitlebar(titleBar: TitleBarComponent) {
        titleBar.setBackgroundColor("#A25BFE");
        titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
        titleBar.setTitle('DPoS Voting');
    }

    async getStoredVotes() {
        this.lastVotes = [];

        await this.storage.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, 'dpos2', this.voteService.masterWalletId + '-votes', []).then(data => {
            if (data) {
                // filter invalid votes.
                this.lastVotes = data;
                Logger.log(App.DPOS_VOTING, 'lastVotes', this.lastVotes);
            }
        });
    }

    async setStoredVotes(keys) {
        this.lastVotes = keys;
        Logger.log(App.DPOS_VOTING, 'lastVotes updated', this.lastVotes);
        await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "dpos2", this.voteService.masterWalletId + '-votes', this.lastVotes);
    }

    async checkBalanceForRegDposNode(): Promise<boolean> {
        if (!await this.voteService.checkBalanceForRegistration()) {
            await this.popupProvider.ionicAlert('wallet.insufficient-balance', 'dposvoting.reg-dpos-balance-not-enough');
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
        var ownerPublicKey = '';
        let currentHeight = await this.voteService.getCurrentHeight();
        let currentBlockTimestamp = await this.voteService.getBlockByHeight(currentHeight);

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

            if (result && !Util.isEmptyObject(result.producers)) {
                Logger.log(App.DPOS_VOTING, "dposlist:", result.producers);
                this.totalVotes = result.totalvotes;
                this._nodes = result.producers;

                var expired30 = 7 * 30;
                for (const node of result.producers) {
                    if (node.ownerpublickey == ownerPublicKey) {
                        this.dposInfo = node;
                    }

                    if (node.identity && node.identity == "DPoSV1") {
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

                        var until = node.stakeuntil - currentHeight;
                        node.stakeDays = Math.ceil(until / 720);
                        if (until > 720 * 7) { //more than 7 days
                            var stakeTimestamp = until * 120 + currentBlockTimestamp
                            node.stakeuntilDate = this.uxService.formatDate(stakeTimestamp);
                        }
                        else {
                            node.stakeuntilExpired = await this.voteService.getRemainingTimeString(until);
                        }

                        if (until < 720 * 30) { //less than 30 days
                            if (node == this.dposInfo) {
                                this.myStakeExpired30 = await this.voteService.getRemainingTimeString(until);
                            }
                            else if (until < expired30) {
                                expired30 = until;
                            }
                        }
                        this.dposList.push(node);
                    }

                    this.getNodeIcon(node);
                }

                if (expired30 < 720 * 30) {
                    this.stakeExpired30 = await this.voteService.getRemainingTimeString(until);
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

        this.needRefreshNodes = false;
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

    async getAllVoteds(): Promise<any[]> {
        var stakeAddress = await this.voteService.sourceSubwallet.getOwnerStakeAddress()
        Logger.log(App.DPOS_VOTING, 'getOwnerStakeAddress', stakeAddress);
        let currentHeight = await this.voteService.getCurrentHeight();
        let currentBlockTimestamp = await this.voteService.getBlockByHeight(currentHeight);

        const param = {
            method: 'getalldetaileddposv2votes',
            params: {
                stakeaddresses: [stakeAddress],
            },
        };

        var ret = [];
        let rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
        const result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
        Logger.log(App.DPOS_VOTING, 'getalldetaileddposv2votes', result);
        if (result) {
            var index = 0;
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

                        ret.push(item);
                    }
                }
            }
        }

        return ret;
    }

    getNodeIcon(node: DPoS2Node) {
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
                node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Orchard.png';
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
                node.Location = 'South Korea';
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
            case 'Dragonela 2.0':
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
                node.Location = 'Canada';
                break;
            case 'Glide':
                node.imageUrl = 'https://elanodes.com/logos/Glide1.png';
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
            case 'elanode.eth':
                node.Location = 'Germany';
                break;
            case 'Elastos.info':
                node.imageUrl = 'https://elanodes.com/logos/Elastos.info.png';
                node.Location = 'Japan';
                break;
        }

        if (node.state !== 'Active') {
            node.Location = 'Inactive';
        }
    }

}
