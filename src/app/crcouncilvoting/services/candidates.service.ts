import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Candidate } from '../model/candidates.model';
import { AlertController, ToastController } from '@ionic/angular';
import { Selected } from '../model/selected.model';
import { CouncilMember } from '../model/council.model';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';

@Injectable({
  providedIn: 'root'
})
export class CandidatesService {

  constructor(
    private http: HttpClient,
    private globalNav: GlobalNavService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private storage: GlobalStorageService
  ) { }


  /** Election **/
  public candidates: Candidate[] = [];
  public totalVotes: number = 0;
  public selectedCandidates: Selected[] = [];

  /** Election Results **/
  public councilTerm: number;
  public council: CouncilMember[] = [];

  public httpOptions = {
    headers: new HttpHeaders({
      'Content-Type':  'application/json',
    })
  };

  public params = {
    "method": "listcrcandidates",
    "params": {"state": "active"}
  };

  init() {
    this.fetchCandidates();
    this.getSelectedCandidates();
  }

  getSelectedCandidates() {
    this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, 'crcouncil', 'votes', []).then(data => {
      Logger.log('crcouncil', 'Selected Candidates', data);
      if(data) {
        this.selectedCandidates = data;
      }
    });
  }

  fetchCandidates() {
    Logger.log('crcouncil', 'Fetching Candidates..');
    this.http.post<any>('https://api.elastos.io/ela/', this.params, this.httpOptions).subscribe((res) => {
      Logger.log('crcouncil', 'Candidates fetched', res);
      if(res.result.crcandidatesinfo) {
        this.candidates = res.result.crcandidatesinfo;
        Logger.log('crcouncil', 'Candidates added', this.candidates);
        this.totalVotes = parseFloat(res.result.totalvotes);
        this.getLogos();
      } else {
        this.fetchElectionResults();
      }
    }, (err) => {
      Logger.error('crcouncil', err);
      this.alertErr('The CRC Council is not available at this time, please try again later');
    });
  }

  async fetchElectionResults() {
    await this.fetchCouncilTerm();
    this.fetchCouncil();
  }

  fetchCouncilTerm() {
    return new Promise<void>((resolve, reject) => {
      this.http.get<any>('https://api.cyberrepublic.org/api/council/term').subscribe((res) => {
        Logger.log('crcouncil', 'Council terms fetched', res);
        this.councilTerm = res.data[0].startDate;
        Logger.log('crcouncil', 'Council term added', this.councilTerm);
        resolve();
      }, (err) => {
        Logger.error('crcouncil', err);
        resolve();
      });
    });
  }

  fetchCouncil() {
    this.http.get<any>('https://api.cyberrepublic.org/api/council/list/1').subscribe((res) => {
      Logger.log('crcouncil', 'Counsil fetched', res);
      this.council = res.data.council;
      Logger.log('crcouncil', 'Council added', this.council);
      this.getLogos();
    }, (err) => {
      this.alertErr('The CRC Council is not available at this time, please try again later');
      Logger.error('crcouncil', err);
    });
  }

  getLogos() {
    if (this.candidates.length > 0) {
      this.candidates.map((can) => {
        if (can.nickname === 'Michael S') {
          can.imageUrl = '/assets/crcouncilvoting/candidates/mikes.jpg';
          can.location = 'United States'
        }
        if (can.nickname === 'SunnyFengHan') {
          can.imageUrl = '/assets/crcouncilvoting/candidates/SunnyFengHan.png';
          can.location = 'United States'
        }
        if (can.nickname === 'Orchard Trinity') {
          can.imageUrl = '/assets/crcouncilvoting/candidates/orchard.png';
          can.location = 'United Kingdom'
        }
        if (can.nickname === 'The Strawberry Council') {
          can.location = 'United States'
          can.imageUrl = '/assets/crcouncilvoting/candidates/strawberry.png';
        }
        if (can.nickname === 'Ela Cloud (亦来云盘）') {
          can.location = 'China'
          can.imageUrl = '/assets/crcouncilvoting/candidates/elacloud.png';
        }
        if (can.nickname === 'Dingning(丁宁)') {
          can.location = 'China'
          can.imageUrl = '/assets/crcouncilvoting/candidates/dingning.png';
        }
        if (can.nickname === 'Tyro lee小黑狼') {
          can.location = 'China'
          can.imageUrl = '/assets/crcouncilvoting/candidates/tyrolee.png';
        }
        if (can.nickname === 'zhangqing（张青）') {
          can.location = 'China'
          can.imageUrl = '/assets/crcouncilvoting/candidates/zhangqing.png';
        }
        if (can.nickname === 'ELADAO') {
          can.location = 'China'
        }
        if (can.nickname === 'Zhang Feng') {
          can.location = 'China'
          can.imageUrl = '/assets/crcouncilvoting/candidates/zhangfeng.png';
        }
        if (can.nickname === 'Alex Shipp') {
          can.location = 'United States'
          can.imageUrl = '/assets/crcouncilvoting/candidates/alexshipp.png';
        }
        if (can.nickname === 'CR Malaysia') {
          can.location = 'Malaysia'
          can.imageUrl = '/assets/crcouncilvoting/candidates/crmalaysia.png';
        }
        if (can.nickname === 'Adem Bilican') {
          can.location = 'Switzerland'
          can.imageUrl = '/assets/crcouncilvoting/candidates/adembilican.png';
        }
        if (can.nickname === 'Bitwork Council Committee') {
          can.location = 'Hong Kong'
          can.imageUrl = '/assets/crcouncilvoting/candidates/bitwork.png';
        }
        if (can.nickname === '中文社区管理员团队') {
          can.location = 'China'
          can.imageUrl = '/assets/crcouncilvoting/candidates/chinese.png';
        }
        if (can.nickname === 'Anders Alm') {
          can.location = 'Norway'
          can.imageUrl = '/assets/crcouncilvoting/candidates/andersalm.png';
        }
        if (can.nickname === 'ELAFISH') {
          can.location = 'Canada'
          can.imageUrl = '/assets/crcouncilvoting/candidates/elafish.png';
        }
        if (can.nickname === 'CR Frigate') {
          can.location = 'Hong Kong'
          can.imageUrl = '/assets/crcouncilvoting/candidates/crfrigate.png';
        }
        if (can.nickname === 'Su Yipeng ') {
          can.location = 'China'
          can.imageUrl = '/assets/crcouncilvoting/candidates/yipeng.png';
        }
        if (can.nickname === 'ElastosDMA') {
          can.location = 'China'
          can.imageUrl = '/assets/crcouncilvoting/candidates/dma.png';
        }
        if (can.nickname === 'Talha Idris (TI)') {
          can.location = 'South Africa'
          can.imageUrl = '/assets/crcouncilvoting/candidates/talha.png';
        }
        if (can.nickname === 'Niu Jingyu') {
          can.location = 'China'
          can.imageUrl = '/assets/crcouncilvoting/candidates/niu.png';
        }
        if (can.nickname === 'WeFilm Council ') {
          can.location = 'Canada'
          can.imageUrl = '/assets/crcouncilvoting/candidates/wefilmchain.png';
        }
      });
    } else {
      this.council.map((member) => {
        // Houston Mike
        if(member.did === 'iUZ9bXS8Zi1sPRMQ39S4j8f9L4QkWYBzvj') {
          member.avatar = '/assets/crcouncilvoting/candidates/mikes.jpg';
          member.location = 'United States'
        }
        // Yipeng
        if(member.did === 'iWNmSFLfUfQhLUbL7PuiB6cbttVDFCiYwX') {
          member.avatar = '/assets/crcouncilvoting/candidates/yipeng.png';
          member.location = 'China'
        }
        // ElaCloud
        if(member.did === 'iUzKygVkqP9jjuAHk38bmF8kifgcUh5jTG') {
          member.avatar = '/assets/crcouncilvoting/candidates/elacloud.png';
          member.location = 'China'
        }
        // Sunney FengHan
        if(member.did === 'ioNZHmG9CpDvjEfpRNWU1vd8i1rSHzVGB2') {
          member.avatar = '/assets/crcouncilvoting/candidates/SunnyFengHan.png';
          member.location = 'United States';
        }
        // Alex Shipp
        if(member.did === 'iXGQSD3Lemj1cuiRv37ZvMtqa6KhrgmZQ3') {
          member.avatar = '/assets/crcouncilvoting/candidates/alexshipp.png';
          member.location = 'United States'
        }
        // Adam Bilican
        if(member.did === 'iiVR8qqvNtc82M4GKYx8r7sdHBNHRsbZtf') {
          member.avatar = '/assets/crcouncilvoting/candidates/adembilican.png';
          member.location = 'Switzerland';
        }
        // Strawberry Council
        if(member.did === 'ioe6q6iXHvMEmdBEB4wpd1WGyrgEuttw93') {
          member.avatar = '/assets/crcouncilvoting/candidates/strawberry.png';
          member.location = 'United States'
        }
        // Tyro Lee
        if(member.did === 'iim5XqL6CrBddotEymqMMxLC2Cenu3YRGX') {
          member.avatar = '/assets/crcouncilvoting/candidates/tyrolee.png';
          member.location = 'China'
        }
        // Orchard
        if(member.did === 'iTN9V9kaBewdNE9aw7DfqHgRn6NcDj8HCf') {
          member.avatar = '/assets/crcouncilvoting/candidates/orchard.png';
          member.location = 'United Kingdom'
        }
        // 中文社区管理员团队
        if(member.did === 'ieNQXxsnsSx2EGi7xTdDhQnDiV5KTAQoCF') {
          member.avatar = '/assets/crcouncilvoting/candidates/chinese.png';
          member.location = 'China'
        }
        // DMA
        if(member.did === 'iqprEBvoctqdXNEh2mpNNhPcjREwBqcWjm') {
          member.avatar = '/assets/crcouncilvoting/candidates/dma.png';
          member.location = 'China'
        }
        // Talha
        if(member.did === 'iZ7ZUtj83mr3CnYCymNceWexGiJPJKmhPk') {
          member.avatar = '/assets/crcouncilvoting/candidates/talha.png';
          member.location = 'South Africa'
        }
      });
    }
  }

  async alertErr(err: string) {
    const alert = await this.alertCtrl.create({
      mode: 'ios',
      header: 'Error',
      message: err,
      buttons: [
       {
          text: 'Okay',
          handler: () => {
            this.globalNav.navigateHome();
          }
        }
      ]
    });

    await alert.present();
  }

  async votingEndedToast() {
    const toast = await this.toastCtrl.create({
      mode: 'ios',
      position: 'bottom',
      color: 'primary',
      header: 'The CRC Election has ended',
      message: 'There won\'t be any voting here until the next election cycle',
      duration: 6000
    });

    await toast.present();
  }

}
