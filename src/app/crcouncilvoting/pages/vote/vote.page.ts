import { Component, OnInit, NgZone, OnDestroy } from '@angular/core';
import { CandidatesService } from '../../services/candidates.service';
import { ToastController } from '@ionic/angular';
import { StorageService } from '../../services/storage.service';
import { ActivatedRoute, Router } from '@angular/router';

declare let essentialsIntent: EssentialsIntentPlugin.Intent;

@Component({
  selector: 'app-vote',
  templateUrl: './vote.page.html',
  styleUrls: ['./vote.page.scss'],
})
export class VotePage implements OnInit, OnDestroy {

  constructor(
    public candidatesService: CandidatesService,
    private storageService: StorageService,
    private toastCtrl: ToastController,
    private router: Router,
    private route: ActivatedRoute,
    private zone: NgZone
  ) { }

  public castingVote = false;
  public votesCasted = false;
  public totalEla: number = 0;
  private votedEla: number = 0;

  ngOnInit() {
    console.log('My Candidates', this.candidatesService.selectedCandidates);
    this.route.queryParams.subscribe(params => {
      if (params) {
        const fees = 0.001;// it is enough.
        this.totalEla = Math.floor(parseInt(params.elaamount) / 100000000 - fees);
        console.log('ELA Balance', this.totalEla);
      }
    });
  }

  ngOnDestroy(){
  }

  ionViewWillEnter() {
    // TODO @chad titleBarManager.setTitle('My Candidates');
    this.setTitleBarBackKeyShown(true);
  }

  ionViewDidEnter() {
  }

  ionViewWillLeave() {
    this.castingVote = false;
    this.votesCasted = false;
    this.candidatesService.candidates = [];
    this.candidatesService.init();
    this.setTitleBarBackKeyShown(false);
  }

  setTitleBarBackKeyShown(show: boolean) {
    /* TODO @chad if (show) {
        titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_LEFT, {
            key: "back",
            iconPath: TitleBarPlugin.BuiltInIcon.BACK
        });
    }
    else {
        titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_LEFT, null);
    }*/
  }

  distribute() {
    let votes = this.totalEla / this.candidatesService.selectedCandidates.length;
    console.log('Distributed votes', votes);
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
      console.log(votedCandidates);
      this.storageService.setVotes(this.candidatesService.selectedCandidates);
      this.castingVote = true;
      this.votesCasted = false;

      setTimeout(async () => {
        try {
          let res = await essentialsIntent.sendIntent(
            'crmembervote',
            { votes: votedCandidates });

          if(res.result.txid === null ) {
            this.castingVote = false;
            this.voteFailedToast('Vote processing was incomplete');
          } else {
            console.log('Insent sent sucessfully', res);
            this.castingVote = false;
            this.votesCasted = true;
            this.voteSuccessToast(res.result.txid);
          }
        }
        catch (err) {
          console.log('Intent sent failed', err);
          this.castingVote = false;
          this.voteFailedToast(err);
        }
      }, 1000);
    }
  }

  /****************** Misc *******************/
  setInputDefault(event) {
    console.log(event);
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
      message: 'Txid:' + txid.slice(0,30) + '...',
      color: 'tertiary',
      cssClass: 'customToast',
      buttons: [
        {
          text: 'Okay',
          handler: () => {
            toast.dismiss();
            // essentialsIntent.close();
            this.router.navigate(['/candidates']);
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
            // essentialsIntent.close();
            this.router.navigate(['/candidates']);
          }
        }
      ]
    });
    toast.present();
  }
}
