import { Component, OnInit, ViewChild } from "@angular/core";
import { ToastController, AlertController } from "@ionic/angular";
import { CandidatesService } from "../../services/candidates.service";
import { Candidate } from "../../model/candidates.model";
import { NavigationExtras } from "@angular/router";
import { StorageService } from "../../services/storage.service";

import * as moment from 'moment';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { GlobalNavService } from "src/app/services/global.nav.service";
import { TranslateService } from '@ngx-translate/core';

declare let essentialsIntent: EssentialsIntentPlugin.Intent;

@Component({
  selector: "app-candidates",
  templateUrl: "./candidates.page.html",
  styleUrls: ["./candidates.page.scss"]
})
export class CandidatesPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  constructor(
    public candidatesService: CandidatesService,
    private storage: StorageService,
    private globalNav: GlobalNavService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    public translate: TranslateService
  ) {}

  public candidate: Candidate;
  public showCandidate = false;
  public candidateIndex: number;
  public addingCandidates = false;
  onItemClickedListener: any;

  ngOnInit() {
    this.showCandidate = false;
  }

  ionViewWillEnter() {
    this.titleBar.setTheme('linear-gradient(40deg, #181d20 0%, #1acda0 50%, #181d20 100%)', TitleBarForegroundMode.LIGHT);
    this.titleBar.setNavigationMode(null);

    if(this.candidatesService.candidates.length) {
      this.titleBar.setTitle(this.translate.instant('council-candidates'));
    } else if(this.candidatesService.council.length){
      this.titleBar.setTitle(this.translate.instant('council-members'));
    } else {
      this.titleBar.setTitle(this.translate.instant('council-voting'));
    }
  }


  /****************** Select Candidate *******************/
  addCandidate(candidate: Candidate) {
    let targetCandidate = this.candidatesService.selectedCandidates.find(
      _candidate => _candidate.cid === candidate.cid
    );
    if (!targetCandidate) {
      this.candidatesService.selectedCandidates.push({
        cid: candidate.cid,
        nickname: candidate.nickname,
        imageUrl: candidate.imageUrl,
        userVotes: 0
      });
    } else {
      this.candidatesService.selectedCandidates = this.candidatesService.selectedCandidates.filter(
        _candidate => _candidate.cid !== candidate.cid
      );
    }
    console.log(
      "Selected candidates",
      this.candidatesService.selectedCandidates
    );
  }

  /****************** Route to Vote *******************/
  async addCandidates() {
    try {
      let res = await essentialsIntent.sendIntent(
        "walletaccess",
        { elaamount: { reason: "For CRC voting rights" } });

      let props: NavigationExtras = {
        queryParams: {
          elaamount: res.result.walletinfo[0].elaamount
        }
      };
      console.log("Candidates", this.candidatesService.selectedCandidates);
      this.globalNav.navigateTo("crcouncilvoting", "/crcouncilvoting/vote", props);
    }
    catch (err) {
      console.log(err);
      this.toastWalletErr();
    }
  }

  /****************** Modify Values *******************/
  candidateIsSelected(candidate: Candidate): Boolean {
    let targetCandidate = this.candidatesService.selectedCandidates.find(
      _candidate => _candidate.cid === candidate.cid
    );
    if (targetCandidate) {
      return true;
    } else {
      return false;
    }
  }

  fixVotes(votes: string) {
    return parseInt(votes);
  }

  getCouncilStartDate() {
    return moment(this.candidatesService.councilTerm).format("MMM Do YY");
  }

  /****************** Show Slide *******************/
  _showCandidate(index: number, can: Candidate) {
    this.showCandidate = !this.showCandidate;
    this.candidateIndex = index;
    this.candidate = can;
  }

  /****************** Toasts/Alerts *******************/
  async toastWalletErr() {
    const toast = await this.toastCtrl.create({
      mode: "ios",
      position: "top",
      color: "primary",
      header: "Failed to fetch ELA balance",
      message: "ELA balance is needed to assess your voting rights"
    });
    toast.present();
  }

  async walletAlert() {
    const alert = await this.alertCtrl.create({
      mode: "ios",
      header: "Wallet Access Request",
      message:
        "Wallet will fetch your ELA balance to estimate your voting power",
      buttons: [
        {
          text: "Deny",
          role: "cancel",
          cssClass: "secondary",
          handler: () => {
            console.log("No thanks");
          }
        },
        {
          text: "Continue",
          handler: () => {
            this.addCandidates();
            /* this.addingCandidates = true;
            setTimeout(() => {
              this.addCandidates();
            }, 1000); */
          }
        }
      ]
    });
    alert.present();
  }

  async registerAppAlert() {
    const alert = await this.alertCtrl.create({
      mode: "ios",
      header: "Would you like to add CRC Voting to your profile?",
      message:
        "Registering a capsule will allow your followers via Contacts to effortlessly browse your favorite capsules!",
      buttons: [
        {
          text: "Cancel",
          role: "cancel",
          cssClass: "secondary",
          handler: () => {
            console.log("No thanks");
          }
        },
        {
          text: "Yes",
          handler: () => {
            essentialsIntent.sendIntent(
              "registerapplicationprofile",
              {
                identifier: "CRC Election",
                connectactiontitle: "Take part in the new Smart Web democracy!"
              }
            );
          }
        }
      ]
    });
    alert.present();
  }

  deleteStorage() {
    this.storage.setVotes([]);
  }
}
