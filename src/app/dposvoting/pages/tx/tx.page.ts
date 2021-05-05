import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as moment from 'moment';

import { Vote } from '../../model/history.model';
import { NodesService } from '../../services/nodes.service';
import { Node } from '../../model/nodes.model';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode, TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-tx',
  templateUrl: './tx.page.html',
  styleUrls: ['./tx.page.scss'],
})
export class TxPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  // Initial values
  public vote: Vote;
  public _nodes: Node[] = [];

  // Node Detail
  public showNode: boolean = false;
  public nodeIndex: number;
  public node: Node;

  constructor(
    public nodesService: NodesService,
    private route: ActivatedRoute,
    public translate: TranslateService,
    private globalNav: GlobalNavService,
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(paramMap => {
      if (!paramMap.has('txid')) {
        this.globalNav.navigateBack();
        return;
      }
      this.vote = this.nodesService.getVote(paramMap.get('txid'));
      this.getNodes();
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('launcher.app-dpos-voting'));
    this.titleBar.setTheme('#732dcf', TitleBarForegroundMode.LIGHT);
    this.titleBar.setNavigationMode(TitleBarNavigationMode.BACK);
  }

  getNodes() {
    this.nodesService._nodes.map(node => {
      if (this.vote.keys.includes(node.ownerpublickey)) {
        this._nodes = this._nodes.concat(node)
      }
    });
  }

  modDate(date) {
    return moment(date).format("MMM Do YYYY, h:mm:ss a");
  }

  //// Define Values ////
  getVotes(votes: string): string {
    const fixedVotes: number = parseInt(votes);
    return fixedVotes.toLocaleString().split(/\s/).join(',');
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
}
