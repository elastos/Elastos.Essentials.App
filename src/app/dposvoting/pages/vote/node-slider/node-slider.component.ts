import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Node } from '../../../model/nodes.model';
import { IonSlides } from '@ionic/angular';
import { NodesService } from '../../../services/nodes.service';

@Component({
  selector: 'app-node-slider',
  templateUrl: './node-slider.component.html',
  styleUrls: ['./node-slider.component.scss'],
})
export class NodeSliderComponent implements OnInit {

  @ViewChild('slider', {static: false}) slider: IonSlides;

  @Input() _nodes: Node[] = [];
  @Input() totalVotes: number = 0;
  @Input() nodeIndex: number;
  @Input() node: Node;

  public displayedNodes: Node[] = [];

  slideOpts = {
    initialSlide: 1,
    speed: 400,
    centeredSlides: true,
    slidesPerView: 1.2
  };

  constructor(
    public nodesService: NodesService
  ) {
  }

  ngOnInit() {
    this.displayedNodes = this._nodes.slice(0, this.nodeIndex + 2);
    this.slideOpts.initialSlide = this.displayedNodes.indexOf(this.node);
  }

  //// Increment nodes array when sliding forward ////
  loadNext() {
    let lastNode: Node = this.displayedNodes.slice(-1)[0];
    let nextNodeIndex: number = this._nodes.indexOf(lastNode) + 1;
    if(this._nodes[nextNodeIndex]) {
      this.displayedNodes.push(this._nodes[nextNodeIndex]);
    } else {
      return;
    }
    console.log('last node', lastNode);
    console.log('next node', this._nodes[nextNodeIndex]);
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
    const dailyRewards: number =  parseFloat(yearlyRewards) / 365;
    return dailyRewards.toFixed(2);
  }
}

