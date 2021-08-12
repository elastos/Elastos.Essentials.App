import { Component, OnInit, Input } from '@angular/core';
import { Logger } from 'src/app/logger';
import { DPosNode } from '../../../model/nodes.model';
import { NodesService } from '../../../services/nodes.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'app-node-slider-search',
  templateUrl: './node-slider.component.html',
  styleUrls: ['./node-slider.component.scss'],
})
export class NodeSliderComponent implements OnInit {

  @Input() _nodes: DPosNode[] = [];
  @Input() totalVotes: number = 0;
  @Input() nodeIndex: number;
  @Input() node: DPosNode;

  public displayedArr: DPosNode[] = [];

  slideOpts = {
    initialSlide: null,
    speed: 400,
    centeredSlides: true,
    slidesPerView: 1.2
  };

  constructor(
    public nodesService: NodesService,
    public theme: GlobalThemeService
  ) {
  }

  ngOnInit() {
    this.displayedArr = this._nodes.slice(0, this.nodeIndex + 2);
    this.slideOpts.initialSlide = this.displayedArr.indexOf(this.node);
  }

  //// Increment nodes array when sliding forward ////
  loadNext() {
    let lastNode: DPosNode = this.displayedArr.slice(-1)[0];
    let nextNodeIndex: number = this._nodes.indexOf(lastNode) + 1;
    if(nextNodeIndex) {
      this.displayedArr.push(this._nodes[nextNodeIndex]);
    }
    Logger.log('dposvoting', 'last node', lastNode);
    Logger.log('dposvoting', 'next node', this._nodes[nextNodeIndex]);
  }

  //// Define Values ////
  getVotes(votes: string): string {
    const fixedVotes = parseInt(votes);
    return fixedVotes.toLocaleString().split(/\s/).join(',');
  }

  getVotePercent(votes: string): string {
    const votePercent: number = parseFloat(votes) / this.totalVotes * 100;
    return votePercent.toFixed(2);
  }

  getRewards(yearlyRewards: string): string {
    if (yearlyRewards) {
      const dailyRewards: number =  parseFloat(yearlyRewards) / 365;
      return dailyRewards.toFixed(2);
    } else {
      return '...';
    }
  }

  /* getEla(votes: number): string {
    let ElaVotes: number = Math.ceil(votes / 36);
    return ElaVotes.toLocaleString().split(/\s/).join(',');
  } */
}
