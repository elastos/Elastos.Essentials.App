import { Component, OnInit, ViewChild } from '@angular/core';
import { ToastController, AlertController } from '@ionic/angular';

import { NodesService } from '../../services/nodes.service';
import { Node } from '../../model/nodes.model';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';


@Component({
  selector: 'app-vote',
  templateUrl: './vote.page.html',
  styleUrls: ['./vote.page.scss'],
})
export class VotePage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  // Values
  public selectedNodes: number = 0;

  // Intent
  public voted: boolean = false;

  // Node Detail
  public showNode: boolean = false;
  public nodeIndex: number;
  public node: Node;

  // Toast for voteFailed/voteSuccess
  private toast: any = null;

  constructor(
    public nodesService: NodesService,
    private storage: GlobalStorageService,
    private toastController: ToastController,
    private alertController: AlertController,
    private translate: TranslateService,
    private globalIntentService: GlobalIntentService,
    public theme: GlobalThemeService
  ) {
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('app-dpos-voting'));
    this.titleBar.setTheme('#732dcf', TitleBarForegroundMode.LIGHT);
    this.titleBar.setNavigationMode(null);
  }

  ionViewWillLeave() {
  }

  //// Vote intent ////
  async castVote() {
    let castedNodeKeys: string[] = [];
    this.nodesService._nodes.map(node => {
      if (node.isChecked === true) {
        castedNodeKeys = castedNodeKeys.concat(node.ownerpublickey);
      }
    });

    if (castedNodeKeys.length > 0) {
      Logger.log('dposvoting', castedNodeKeys);
      this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "dposvoting", "nodes", castedNodeKeys);
      let votesSent: boolean = false;

      try {
        let res = await this.globalIntentService.sendIntent(
          "https://wallet.elastos.net/dposvotetransaction",
          { publickeys: (castedNodeKeys) });

        Logger.log('dposvoting', 'Insent sent sucessfully', res);

        if(res.result.txid === null ) {
          votesSent = true;
          this.voteFailed('vote-cancelled');
        } else {
          votesSent = true;
          this.voted = true;
          let date = new Date;
          let txid: string = res.result.txid;

          this.nodesService._votes = this.nodesService._votes.concat({ date: date, tx: txid, keys: castedNodeKeys });
          Logger.log('dposvoting', 'Vote history updated', this.nodesService._votes);
          this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "dposvoting", "votes", this.nodesService._votes);
          this.voteSuccess(res.result.txid);
        }
      }
      catch (err) {
          votesSent = true;
          Logger.log('dposvoting', 'Intent sent failed', err);
          this.voteFailed(err);
      }

      // If no response is sent from wallet, show vote transaction has failed
      setTimeout(() => {
        if(votesSent === false) {
          this.voteFailed('vote-timeout');
        }
      }, 10000)

    } else {
      this.noNodesChecked();
    }
  }

  //// Define Values ////
  getVotes(votes: string): string {
    const fixedVotes: number = parseInt(votes);
    return fixedVotes.toLocaleString().split(/\s/).join(',');
  }

  getSelectedNodes(): number {
    this.selectedNodes = 0;
    this.nodesService._nodes.map(node => {
      if (node.isChecked === true) {
        this.selectedNodes++;
      }
    });
    return this.selectedNodes;
  }

  getVotePercent(votes: string): string {
    const votePercent: number = parseFloat(votes) / this.nodesService.totalVotes * 100;
    return votePercent.toFixed(2);
  }

  //// Node Detail ////
  _showNode(index: number, node: Node) {
    this.showNode = !this.showNode;
    this.nodeIndex = index;
    this.node = node;
  }

  return() {
    this.showNode = false;
  }

  //// Alerts ////
  async registerAppAlert() {
    const alert = await this.alertController.create({
      mode: 'ios',
      header: 'Would you like to add DPoS Voting to your profile?',
      message: 'Registering a capsule will allow your followers via Contacts to effortlessly browse your favorite capsules!',
      buttons: [
        {
          text: this.translate.instant('cancel'),
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            Logger.log('dposvoting', 'No thanks');
          }
        },
        {
          text: this.translate.instant('confirm'),
          handler: () => {
            this.globalIntentService.sendIntent("https://did.elastos.net/registerapplicationprofile", {
              identifier: "DPoS Voting",
              connectactiontitle: "Vote for your favorite Supernodes and earn ELA along the way"
            });
          }
        },
      ]
    });
    alert.present();
  }

  async voteSuccess(res: string) {
    this.closeToast();
    this.toast = await this.toastController.create({
      position: 'bottom',
      header: this.translate.instant('vote-success'),
      message: 'txid:' + res.slice(0,30) + '...',
      color: "primary",
      buttons: [
        {
          text: this.translate.instant('ok'),
          handler: () => {
            this.toast.dismiss();
          }
        }
      ],
    });
    this.toast.present();
  }

  async voteFailed(res: string) {
    this.closeToast();
    this.toast = await this.toastController.create({
      position: 'bottom',
      header: this.translate.instant('vote-fail'),
      message: this.translate.instant(res),
      color: "primary",
      cssClass: 'toaster',
      buttons: [
        {
          text: this.translate.instant('ok'),
          handler: () => {
            this.toast.dismiss();
          }
        }
      ]
    });
    this.toast.present();
  }

  // If we get response from sendIntent, we need to close the toast showed for timeout
  closeToast() {
    if (this.toast) {
      this.toast.dismiss();
      this.toast = null;
    }
  }

  async noNodesChecked() {
    const toast = await this.toastController.create({
      position: 'bottom',
      header: this.translate.instant('vote-no-nodes-checked'),
      color: "primary",
      duration: 2000
    });
    toast.present();
  }
}


