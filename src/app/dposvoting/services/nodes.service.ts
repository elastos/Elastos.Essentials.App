import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

import { DPosNode } from '../model/nodes.model';
import { Vote } from '../model/history.model';
import { Mainchain, Voters, Price, Block } from '../model/stats.model';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';


@Injectable({
  providedIn: 'root'
})
export class NodesService {

  // Nodes
  public _nodes: DPosNode[] = [];
  public activeNodes: DPosNode[] = [];
  public totalVotes: number = 0;

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
  /*  {
      date: new Date(),
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
      date: new Date(),
      tx: '241315309c645e52fabafe9e8963037829f025526b9b616972b8b7a0965e6ac4',
      keys: [
        '026c8ce246d2587df8a669eee82be4f365ab6cf4fc45e3e539cf0ab91fbab3a809',
        '0315067144eaad471ed0c355e6f9822c51b93308e0cd9febf0792304c605973916',
        '030cda9b67897652dbf9f85cb0aba39a09203004f59366517a5461b1e48d9faa64',
        '02b6052f5f65089be3b94efb91c98a5f94c0bf7fbefdbd85c1d547aa7b3d547710'
      ]
    } */
  ];

  // Fetch
  private nodeApi: string = 'https://node1.elaphant.app/api/';
  private apiRPC: string = 'https://api.elastos.io/ela';
//   private apiRPC: string = 'https://api-testnet.elastos.io/ela';
  private elaNodeUrl: string = 'https://elanodes.com/wp-content/uploads/custom/images/';
  // private proxyurl = "https://sheltered-wave-29419.herokuapp.com/";

  // This is too slow, so call once.
  private isFetchingRewardOrDone = false;
  private rewardResult: any = null; //TODO Do not use any.

  constructor(
    private http: HttpClient,
    private storage: GlobalStorageService,
    private globalIntentService: GlobalIntentService,
  ) {}

  get nodes(): DPosNode[] {
    return [...this._nodes.filter((a,b) => this._nodes.indexOf(a) === b)];
  }

  getNode(id: string): DPosNode {
    return {...this._nodes.find(node => node.nodepublickey === id)};
  }

  getVote(id: string): Vote {
    return {...this._votes.find(vote => vote.tx === id)};
  }

  async init() {
    Logger.log("dposvoting", "Initializing the nodes service");

    for(let i = 0; i < 20; i ++) {
      this.emptyList.push('');
    }

    // await this.getVisit();
    // await this.getStoredVotes();
    await this.fetchStats();
    await this.fetchNodes();
    if (!this.isFetchingRewardOrDone) {
      this.isFetchingRewardOrDone = true
      // Too slow, don't await
      this.fetchReward();
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
      if(data || data === true) {
        this.firstVisit = false;
      }
    });
   }

   getStoredVotes() {
    this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, 'dposvoting', 'votes', []).then(data => {
      Logger.log('dposvoting', 'Vote history', data);
      if(data && data.length > 0) {
        // filter invalid votes.
        this._votes = data.filter(c => {return c.tx;});;
      }
    });
  }

  getStoredNodes() {
    this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, 'dposvoting', 'nodes', []).then(data => {
      Logger.log('dposvoting', data);
      this._nodes.map(node => {
        if (data && data.includes(node.ownerpublickey) && node.state === 'Active') {
          node.isChecked = true;
        }
      });
    });
  }

  fetchStats() {
    return new Promise<void>((resolve, reject) => {
      this.http.get<any>('https://elanodes.com/api/widgets').subscribe((res) => {
        Logger.log('dposvoting', res);
        if (res) {
          this.statsFetched = true;
          this.mainchain = res.mainchain;
          this.voters = res.voters;
          this.price = res.price;
          this.block = res.block;
        }
        resolve();
      });
    });
  }

  fetchCurrentHeight(): Promise<number> {
    Logger.log('dposvoting', 'Fetching height');
    return new Promise((resolve, reject) => {
      this.http.get<any>(this.nodeApi + '1/currHeight').subscribe((res) => {
        if (res && res.result) {
          Logger.log('dposvoting', 'Current height fetched' + res.result);
          this.currentHeight = res.result;
          resolve(res.result);
        } else {
          Logger.error('dposvoting', 'can not get curr height!');
          reject(null);
        }
      }, (err) => {
        Logger.log('dposvoting', 'fetchCurrentHeight error:', err);
        reject(err);
      });
    });
  }

  fetchNodes() {
    return new Promise<void>((resolve, reject) => {
      Logger.log('dposvoting', 'Fetching Nodes..');
      const param = {
          method: 'listproducers',
          params: {
              state: 'all'
              // state: 'active'
          },
      };

      try {
        const httpOptions = {
          headers: new HttpHeaders({'Content-Type': 'application/json',})
        };

        this.http.post(this.apiRPC, JSON.stringify(param), httpOptions)
          .subscribe((res: any) => {
            if (res && res.result) {
              res.result.producers.map(node => {
                  node.index += 1; // the index start from 0;
              });

              this._nodes = res.result.producers;
              this.activeNodes = this._nodes.filter(node => node.state === 'Active');
              this.getNodeIcon();
              this.getStoredNodes();
              this.totalVotes = res.result.totalvotes;
              this.setupRewardInfo();

              Logger.log('dposvoting', 'Nodes Added..', this._nodes);
              Logger.log('dposvoting', 'Active Nodes..', this.activeNodes);

              resolve();
            }
          }, (err) => {
            Logger.log('dposvoting', 'JsonRPCService httpRequest error:', JSON.stringify(err));
            reject(err);
          });
        } catch (e) {
          Logger.error('dposvoting', 'fetchNodes error:', e)
        }
    });

  }

  async fetchReward() {
    Logger.log('dposvoting', 'start fetchReward');
    try {
      const height: number = await this.fetchCurrentHeight();
      // this api is too slow.
      this.http.get<any>(this.nodeApi + 'v1/dpos/rank/height/' + height +'?state=active').subscribe((res) => {
        if (res && res.result) {
          this.rewardResult = res.result;
          this.setupRewardInfo();
        } else {
          this.isFetchingRewardOrDone = false;
          Logger.log('dposvoting', 'fetchReward can not get the reward info.');
        }

        Logger.log('dposvoting', 'fetchReward end');
      });
    }
    catch (err) {
      Logger.error('dposvoting', 'fetchReward error:', err);
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

  getNodeIcon() {
    this.activeNodes.map(node => {
      if (node.nickname === '韩锋/SunnyFengHan') {
        node.imageUrl = this.elaNodeUrl + 'Sunny_Feng_Han_min.png';
        node.Location = 'United States'
      };
      if (node.nickname === 'Elephant Wallet') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/elephant-wallet.png';
        node.Location = 'Singapore'
      }
      if (node.nickname === 'Elastos Scandinavia') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Scandinavia.png';
        node.Location = 'Sweden'
      };
      if (node.nickname === 'AnyPeer') {
        node.imageUrl = 'https://i.ibb.co/hcVLkJP/download.png';
        node.Location = 'Hong Kong'
      };
      if (node.nickname === 'Wild Strawberries Atlas') {
        node.imageUrl = 'https://i.ibb.co/qDdmLQJ/EPpf-VIMW4-AIx-J30.jpg';
        node.Location = 'United States'
      };
      if (node.nickname === 'Enter Elastos - Ganymede') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Enter%20Elastos.png';
        node.Location = 'Australia'
      };
      if (node.nickname === 'Wild Strawberries Apollo') {
        node.imageUrl = 'https://i.ibb.co/F7L83NH/EPpf-VIa-Wk-AAUM3d.jpg';
        node.Location = 'Ireland'
      };
      if (node.nickname === 'Enter Elastos -Callisto') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Enter%20Elastos.png';
        node.Location = 'United States'
      };
      if (node.nickname === 'TYROLEE(小黑狼)') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/TyroLee.png';
        node.Location = 'China'
      };
      if (node.nickname === 'Hyper') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/hyperim-logo.png';
        node.Location = 'Austria'
      };
      if (node.nickname === 'WeFilmchain') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/wefilmchain.png';
        node.Location = 'Canada'
      };
      if (node.nickname === 'Elastos HIVE') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Hive.png';
        node.Location = 'Hong Kong'
      };
      if (node.nickname === 'Wild Strawberries Calypso') {
        node.imageUrl = 'https://i.ibb.co/ZfCj6Yj/EPpf-VJGXs-AEq0-X1.jpg';
        node.Location = 'Brazil'
      };
      if (node.nickname === 'Enter Elastos - Titan ') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Enter%20Elastos.png';
        node.Location = 'United Kingdom'
      };
      if (node.nickname === 'Noderators - Watermelon') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Noderators.png';
        node.Location = 'India'
      };
      if (node.nickname === 'Elate.ch') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ELATE.CH.png';
        node.Location = 'Switzerland'
      };
      if (node.nickname === 'ThaiEla') {
        node.imageUrl = 'https://i.ibb.co/qF16Mgn/download-1.png';
        node.Location = 'Thailand'
      };
      if (node.nickname === 'Elastos Carrier') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Carrier.png';
        node.Location = 'Hong Kong'
      };
      if (node.nickname === 'Cyber Republic Press CR新闻团队') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Cyber%20Republic%20Press3_min.png';
        node.Location = 'United States'
      };
      if (node.nickname === 'Elastos Forest Node (EFN)') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Elaforestnode.png';
        node.Location = 'Netherlands'
      };
      if (node.nickname === 'ELA News (ELA新闻)') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ELA%20News2.png';
        node.Location = 'South Africa'
      };
      if (node.nickname === 'Elastos News') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ELA%20News2.png';
        node.Location = 'South Africa'
      };
      if (node.nickname === 'elafans') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ELA%20Fans.png';
        node.Location = 'Singapore'
      };
      if (node.nickname === 'elaHorse @ 亦乐马') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ELAHORSE1.png';
        node.Location = 'Malaysia'
      };
      if (node.nickname === 'Witzer（无智）') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Witzer1.png';
        node.Location = 'China'
      };
      if (node.nickname === '无智(Witzer)') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Witzer1.png';
        node.Location = 'China'
      };
      if (node.nickname === 'ElastosDMA') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Elastos%20DMA_min.png';
        node.Location = 'United States'
      };
      if (node.nickname === 'ELAONSEN 亦来温泉') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ELAONSEN.png';
        node.Location = 'Hong Kong'
      };
      if (node.nickname === 'Starfish') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Starfish.png';
        node.Location = 'United States'
      };
      if (node.nickname === 'greengang') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Greengang1.png';
        node.Location = 'China'
      };
      if (node.nickname === 'Elastos Australia') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Elastos%20Australia1.png';
        node.Location = 'Australia'
      };
      if (node.nickname === 'DACA区块链技术公开课') {
        node.imageUrl = 'https://i.ibb.co/jRdhF7L/download-2.png';
        node.Location = 'China'
      };
      if (node.nickname === 'RUOLAN(若兰)') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Roulon1.png';
        node.Location = 'China'
      };
      if (node.nickname === 'RUOLAN节点') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Roulon1.png';
        node.Location = 'China'
      };
      if (node.nickname === 'The Houston Supernode') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Houston-Supernode2_min.png';
        node.Location = 'United States'
      };
      if (node.nickname === 'Cheery Community') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/CheeryCommunity1_min.png';
        node.Location = 'Australia'
      };
      if (node.nickname === 'KuCoin') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/KuCoin.png';
        node.Location = 'China'
      };
      if (node.nickname === 'Noderators - Champagne') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Noderators.png';
        node.Location = 'United States'
      };
      if (node.nickname === 'Noderators - Jazz') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Noderators.png';
        node.Location = 'United States'
      };
      if (node.nickname === 'Quantum Wealth Supernode') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Quantum%20Wealth%20Supernode.png';
        node.Location = 'United States'
      };
      if (node.nickname === 'Northern Lights') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Northern%20Lights.png';
        node.Location = 'Russia'
      };
      if (node.nickname === '链世界') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Blockchain_World_1.png';
        node.Location = 'China'
      };
      if (node.nickname === 'HashWorld') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/HashWorld.png';
        node.Location = 'China'
      };
      if (node.nickname === 'IOEX(ioeX Network)') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ioeX2.png';
        node.Location = 'Hong Kong'
      };
      if (node.nickname === 'Antpool-ELA') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Antpool.png';
        node.Location = 'Brazil'
      };
      if (node.nickname === 'Black Swan') {
        node.imageUrl = 'https://i.ibb.co/yq6z86Y/thumbnail.png';
        node.Location = 'Czech Republic'
      };
      if (node.nickname === 'DHG(大黄哥)') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/DHG2.png';
        node.Location = 'China'
      };
      if (node.nickname === 'DHG') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/DHG2.png';
        node.Location = 'China'
      };
      if (node.nickname === 'CR Regions Global Fund - Clarence Liu') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Cyber%20Republic%20Regions.png';
        node.Location = 'United States'
      };
      if (node.nickname === 'CR Herald | CR 先锋资讯') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/CR%20Herald.png';
        node.Location = 'China'
      };
      if (node.nickname === 'BitWork (CR Region HK)') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/BitWork_1.png';
        node.Location = 'Hong Kong'
      };
      if (node.nickname === 'YDiot(云端物联）') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/YDiot.png';
        node.Location = 'China'
      };
      if (node.nickname === '曲率区动') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Curvature_Zone.png';
        node.Location = 'China'
      };
      if (node.nickname === '区块链研习社') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Chainclub.png';
        node.Location = 'China'
      };
      if (node.nickname === 'BIT.GAME') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/BIT.GAME.png';
        node.Location = 'China'
      };
      if (node.nickname === 'F2Pool') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/F2Pool.png';
        node.Location = 'China'
      };
      if (node.nickname === 'BTC.com') {
        node.imageUrl = 'https://i.ibb.co/0sddwC5/download.jpg';
        node.Location = 'China'
      };
      if (node.nickname === 'ELAFISH') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ELAFISH_1.png';
        node.Location = 'Canada'
      };
      if (node.nickname === 'NextGenius') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Next%20Genius.png';
        node.Location = 'Australia'
      };
      if (node.nickname === 'ElaChat') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ELAChat.png';
        node.Location = 'China'
      };
      if (node.nickname === 'AIoTV(视九TVbox)') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ShijuiTV.png';
        node.Location = 'China'
      };
      if (node.nickname === '比特头条BITETT ') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Bitett.png';
        node.Location = 'China'
      };
      if (node.nickname === 'ELAlliance 大水瓢') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/ELAlliance.png';
        node.Location = 'China'
      };
      if (node.nickname === 'Long ELA，Short the world(追风筝的人)') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Crypto_World1.png';
        node.Location = 'Germany'
      };
      if (node.nickname === 'StorSwift (Elastos HIVE)') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/StorSwift.png';
        node.Location = 'China'
      };
      if (node.nickname === 'viewchain') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/viewchain.png';
        node.Location = 'Singapore'
      };
      if (node.nickname === 'Famous Amos') {
        node.imageUrl = 'https://i.imgur.com/cHRF2Ov.jpg';
        node.Location = 'Trinidad'
      };
      if (node.nickname === 'eladapp.org') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/eladapp.png'
        node.Location = 'United States'
      };
      if (node.nickname === 'ELA.SYDNEY') {
        node.Location = 'Australia'
      };
      if (node.nickname === 'Orion Supernode') {
        node.Location = 'France'
      };
      if (node.nickname === 'Elastos Contributors') {
        node.Location = 'Japan'
      };
      if (node.nickname === 'Ela-Mao') {
        node.Location = 'China'
      };
      if (node.nickname === 'ManhattanProjectFund') {
        node.Location = 'United States'
      };
      if (node.nickname === '河北社区') {
        node.Location = 'China'
      };
      if (node.nickname === 'ELA.GOLD') {
        node.Location = 'Switzerland'
      };
      if (node.nickname === 'Orchard - Elastos Business Development') {
        node.Location = 'Netherlands'
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Orchard.png';
      };
      if (node.nickname === 'KANG') {
        node.Location = 'China'
      };
      if (node.nickname === '虎哥') {
        node.Location = 'China'
      };
      if (node.nickname === '亦来力-ELAPower') {
        node.Location = 'China'
      };
      if (node.nickname === 'ELA new internet') {
        node.Location = 'Pitcairn Islands'
      };
      if (node.nickname === 'To the Moon') {
        node.Location = 'China'
      }
      if (node.nickname === 'Cape of Good Hope') {
        node.Location = 'South Africa'
      };
      if (node.nickname === 'ELABay') {
        node.Location = 'Canada'
      };
      if (node.nickname === 'BOHUI') {
        node.Location = 'China'
      };
      if (node.nickname === '云上') {
        node.Location = 'China'
      };
      if (node.nickname === 'Elastos Blockchain') {
        node.Location = 'China'
      };
      if (node.nickname === 'HicKs乡巴佬') {
        node.Location = 'China'
      };
      if (node.nickname === 'llamamama') {
        node.Location = 'United States'
      };
      if (node.nickname === 'The land of abundance') {
        node.Location = 'China'
      };
      if (node.nickname === '韭菜必赢WE WILL WIN') {
        node.Location = 'China'
      };
      if (node.nickname === '文亦') {
        node.Location = 'China'
      };
      if (node.nickname === 'silence') {
        node.Location = 'China'
      };
      if (node.nickname === 'The future is coming 未来亦来') {
        node.Location = 'China'
      };
      if (node.nickname === 'Ken.Tan') {
        node.Location = 'China'
      };
      if (node.nickname === 'Nights Watch 守夜人') {
        node.Location = 'China'
      };
      if (node.nickname === '米（粒）力联盟') {
        node.Location = 'China'
      };
      if (node.nickname === 'ela') {
        node.Location = 'China'
      };
      if (node.nickname === '我爱云') {
        node.Location = 'China'
      };
      if (node.nickname === '群山') {
        node.Location = 'China'
      };
      if (node.nickname === 'ELADAO') {
        node.Location = 'China'
      };
      if (node.nickname === '币.天下') {
        node.Location = 'China'
      };
      if (node.nickname === 'cryptocalnews') {
        node.Location = 'Canada'
      };
      if (node.nickname === 'Blockchain007') {
        node.Location = 'China'
      }
      if (node.nickname === 'Dragonela') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/dragonela.png';
        node.Location = 'United States'
      }
      if (node.nickname === 'Daily Rewards') {
        node.imageUrl = 'https://elanodes.com/wp-content/uploads/custom/images/Daily_Rewards.png';
        node.Location = 'Japan'
      }
      if (node.nickname === 'United Kingdom') {
        node.imageUrl = 'https://cdn.pixabay.com/photo/2015/11/06/13/29/union-jack-1027898_1280.jpg';
        node.Location = 'United Kingdom'
      }
      if (node.nickname === 'ELA2020') {
        node.Location = 'China'
      }
      if (node.nickname === 'RichMan') {
        node.Location = 'Canada'
      }
      if (node.nickname === 'Good Luck') {
        node.Location = 'Canada'
      }
      if (node.nickname === 'ElaHome') {
        node.Location = 'Canada'
      }
      if (node.nickname === 'CloudSea') {
        node.Location = 'Canada'
      }
      if (node.state !== 'Active') {
        node.Location = 'Inactive';
      }
    });
  }

  openLink(url: string) {
    this.globalIntentService.sendIntent('openurl', { url: url });
  }
}
