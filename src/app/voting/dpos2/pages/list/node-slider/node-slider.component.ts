import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { IonSlides } from '@ionic/angular';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { UXService } from 'src/app/voting/services/ux.service';
import { DPoS2Node } from '../../../model/nodes.model';

@Component({
  selector: 'app-node-slider-list',
  templateUrl: './node-slider.component.html',
  styleUrls: ['./node-slider.component.scss'],
})
export class NodeSliderComponent implements OnInit {

  @ViewChild('slider', { static: false }) slider: IonSlides;

  @Input() _nodes: DPoS2Node[] = [];
  @Input() totalVotes = 0;
  @Input() nodeIndex: number;
  @Input() node: DPoS2Node;

  public displayedNodes: DPoS2Node[] = [];

  slideOpts = {
    initialSlide: 1,
    speed: 400,
    centeredSlides: true,
    slidesPerView: 1.2
  };

  constructor(
    public uxService: UXService,
    public theme: GlobalThemeService
  ) {
  }

  ngOnInit() {
    this.displayedNodes = this._nodes.slice(this.nodeIndex > 0 ? this.nodeIndex - 1 : 0, this.nodeIndex + 2);
    this.slideOpts.initialSlide = this.displayedNodes.indexOf(this.node);
  }

  //// Increment nodes array when sliding forward ////
  loadNext() {
    let lastNode: DPoS2Node = this.displayedNodes.slice(-1)[0];
    let nextNodeIndex: number = this._nodes.indexOf(lastNode) + 1;
    if (this._nodes[nextNodeIndex]) {
      this.displayedNodes.push(this._nodes[nextNodeIndex]);
    }
  }

  loadPrev() {
    let firstNode: DPoS2Node = this.displayedNodes[0];
    let prevNodeIndex: number = this._nodes.indexOf(firstNode) - 1;
    if (this._nodes[prevNodeIndex]) {
      this.displayedNodes.unshift(this._nodes[prevNodeIndex]);
      void this.slider.slideTo(1, 0);
    }
  }

  getRewards(yearlyRewards: string): string {
    if (yearlyRewards) {
      const dailyRewards: number = parseFloat(yearlyRewards) / 365;
      return dailyRewards.toFixed(2);
    } else {
      return '...';
    }
  }
}

