import { Component, OnInit, ViewChild } from "@angular/core";
import { ToastController, AlertController } from "@ionic/angular";
import { CandidatesService } from "../../services/candidates.service";
import { Candidate } from "../../model/candidates.model";
import { NavigationExtras } from "@angular/router";

import * as moment from 'moment';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalNavService } from "src/app/services/global.nav.service";
import { TranslateService } from '@ngx-translate/core';
import { GlobalIntentService } from "src/app/services/global.intent.service";
import { Logger } from "src/app/logger";
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalDIDSessionsService } from "src/app/services/global.didsessions.service";
import { GlobalStorageService } from "src/app/services/global.storage.service";


@Component({
  selector: "app-candidates",
  templateUrl: "./candidates.page.html",
  styleUrls: ["./candidates.page.scss"]
})
export class CandidatesPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  constructor(
    public candidatesService: CandidatesService,
    private storage: GlobalStorageService,
    private globalNav: GlobalNavService,
    private globalIntentService: GlobalIntentService,
    public theme: GlobalThemeService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    public translate: TranslateService
  ) {}

  public candidate: Candidate;
  public showCandidate = false;
  public candidateIndex: number;
  public addingCandidates = false;

  ngOnInit() {
    this.showCandidate = false;
  }

  ionViewWillEnter() {
    this.candidatesService.init();
    if (this.candidatesService.candidates.length) {
      this.titleBar.setTitle(this.translate.instant('crcouncilvoting.council-candidates'));
    } else if(this.candidatesService.council.length){
      this.titleBar.setTitle(this.translate.instant('crcouncilvoting.council-members'));
    } else {
      this.titleBar.setTitle(this.translate.instant('launcher.app-cr-council'));
    }
  }

  async doRefresh(event) {
    await this.candidatesService.ininData()
    setTimeout(() => {
        event.target.complete();
    }, 1000);
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
      Logger.log('crcouncil', "addCandidate: Selected candidates", this.candidatesService.selectedCandidates
    );
  }

  /****************** Route to Vote *******************/
  async addCandidates() {
    try {
      let res = await this.globalIntentService.sendIntent(
        "https://wallet.elastos.net/walletaccess",
        { elaamount: { reason: this.translate.instant("crcouncilvoting.walletaccess-reason") } });
      if (res.result.walletinfo) {
        let props: NavigationExtras = {
          queryParams: {
            elaamount: res.result.walletinfo[0].elaamount
          }
        };
        Logger.log('crcouncil', "addCandidates: Selected Candidates", this.candidatesService.selectedCandidates);
        this.globalNav.navigateTo("crcouncilvoting", "/crcouncilvoting/vote", props);
      }
    }
    catch (err) {
      Logger.log('crcouncil', err);
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
      header: this.translate.instant("crcouncilvoting.get-ela-failed-header"),
      message: this.translate.instant("crcouncilvoting.get-ela-failed-message"),
      duration: 2000,
    });
    toast.present();
  }

  deleteStorage() {
    this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, 'crcouncil', 'votes', []);
  }
}
