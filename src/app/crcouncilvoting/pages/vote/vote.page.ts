import { Component, OnInit, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { CandidatesService } from '../../services/candidates.service';
import { ToastController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TranslateService } from '@ngx-translate/core';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';


@Component({
  selector: 'app-vote',
  templateUrl: './vote.page.html',
  styleUrls: ['./vote.page.scss'],
})
export class VotePage implements OnInit, OnDestroy {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  constructor(
    public candidatesService: CandidatesService,
    private storage: GlobalStorageService,
    private toastCtrl: ToastController,
    private globalNav: GlobalNavService,
    private globalIntentService: GlobalIntentService,
    public theme: GlobalThemeService,
    private route: ActivatedRoute,
    public translate: TranslateService
  ) { }

  public castingVote = false;
  public votesCasted = false;
  public totalEla: number = 0;
  private votedEla: number = 0;

  ngOnInit() {
    Logger.log('crcouncil', 'My Candidates', this.candidatesService.selectedCandidates);
    this.route.queryParams.subscribe(params => {
      if (params) {
        const fees = 0.001;// it is enough.
        this.totalEla = Math.floor(parseInt(params.elaamount) / 100000000 - fees);
        Logger.log('crcouncil', 'ELA Balance', this.totalEla);
      }
    });
  }

  ngOnDestroy(){
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('my-candidates'));
  }

  ionViewDidEnter() {
  }

  ionViewWillLeave() {
    this.castingVote = false;
    this.votesCasted = false;
    this.candidatesService.candidates = [];
    this.candidatesService.init();
  }

  distribute() {
    let votes = this.totalEla / this.candidatesService.selectedCandidates.length;
    Logger.log('crcouncil', 'Distributed votes', votes);
    this.candidatesService.selectedCandidates.forEach((candidate) => {
      candidate.userVotes = votes;
    });
  }

  /****************** Cast Votes *******************/
  cast() {
    let votedCandidates = {};
    this.candidatesService.selectedCandidates.map((candidate) => {
      if(candidate.userVotes && candidate.userVotes > 0) {
        let userVotes = candidate.userVotes * 100000000;
        let _candidate = { [candidate.cid] : userVotes.toFixed(0) } //SELA, can't with fractions
        votedCandidates = { ...votedCandidates, ..._candidate }
      } else {
         candidate.userVotes = 0;
      }
    });

    if(Object.keys(votedCandidates).length === 0) {
     this.toastErr('Please pledge some ELA to your candidates')
    } else if (this.votedEla > this.totalEla) {
      this.toastErr('You are not allowed to pledge more ELA than you own');
    } else {
      Logger.log('crcouncil', votedCandidates);
      this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, 'crcouncil', 'votes', this.candidatesService.selectedCandidates);
      this.castingVote = true;
      this.votesCasted = false;

      setTimeout(async () => {
        try {
          let res = await this.globalIntentService.sendIntent(
            'crmembervote',
            { votes: votedCandidates });

          if(res.result.txid === null ) {
            this.castingVote = false;
            this.voteFailedToast('Vote processing was incomplete');
          } else {
            Logger.log('crcouncil', 'Insent sent sucessfully', res);
            this.castingVote = false;
            this.votesCasted = true;
            this.voteSuccessToast(res.result.txid);
          }
        }
        catch (err) {
          Logger.log('crcouncil', 'Intent sent failed', err);
          this.castingVote = false;
          this.voteFailedToast(err);
        }
      }, 1000);
    }
  }

  /****************** Misc *******************/
  setInputDefault(event) {
    Logger.log('crcouncil', event);
  }

  getElaRemainder() {
    this.votedEla = 0;
    this.candidatesService.selectedCandidates.map((can) => {
      this.votedEla += can.userVotes;
    });
    let remainder = this.totalEla - this.votedEla;
    return remainder.toFixed(2);
  }

  /****************** Toasts/Alerts *******************/
  async toastErr(msg: string) {
    const toast = await this.toastCtrl.create({
      header: msg,
      position: 'middle',
      mode: 'ios',
      color: 'tertiary',
      cssClass: 'customToast',
      duration: 2000
    });
    toast.present();
  }

  async voteSuccessToast(txid: string) {
    const toast = await this.toastCtrl.create({
      mode: 'ios',
      position: 'middle',
      header: 'Voted successfully casted!',
      message: 'txid:' + txid.slice(0,30) + '...',
      color: 'tertiary',
      cssClass: 'customToast',
      buttons: [
        {
          text: 'Okay',
          handler: () => {
            toast.dismiss();
            // appManager.close();
            this.globalNav.navigateTo("crcouncilvoting", '/crcouncilvoting/candidates');
          }
        }
      ]
    });
    toast.present();
  }

  async voteFailedToast(err: string) {
    const toast = await this.toastCtrl.create({
      mode: 'ios',
      position: 'middle',
      header: 'There was an error with casting votes..',
      message: err,
      color: 'tertiary',
      cssClass: 'customToast',
      buttons: [
        {
          text: 'Okay',
          handler: () => {
            toast.dismiss();
            // appManager.close();
            this.globalNav.navigateTo('crcouncilvoting', '/crcouncilvoting/candidates');
          }
        }
      ]
    });
    toast.present();
  }
}
