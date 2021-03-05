import { Component, OnInit, ViewChild } from '@angular/core';
import { IonInput } from '@ionic/angular';

import { NodesService } from '../../services/nodes.service';
import { Node } from '../../model/nodes.model';

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
})
export class SearchPage implements OnInit {

  @ViewChild('search', {static: false}) search: IonInput;

  // Search values
  public filteredNodes: Node[] = [];
  public _node: string = '';

  // Node Detail
  public showNode: boolean = false;
  public nodeIndex: number;
  public node: Node;

  constructor(
    public nodesService: NodesService,
  ) {}

  ngOnInit() {
  }

  ionViewDidEnter() {
    setTimeout(() => {
      this.search.setFocus();
    }, 200);
  }

  //// Search ////
  filterNodes(search: string): any {
    this.filteredNodes = this.nodesService._nodes.filter((node) => {
      if (!search) {
        return;
      } else {
        return node.nickname.toLowerCase().indexOf(search.toLowerCase()) !== -1;
      }
    });
    console.log('Search results', this.filteredNodes);
  }

  //// Define Values ////
  getVotes(votes): string {
    const fixedVotes: number = parseInt(votes);
    return fixedVotes.toLocaleString().split(/\s/).join(',');
  }

  getVotePercent(votes): string {
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
