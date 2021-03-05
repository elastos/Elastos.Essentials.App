import { Component, OnInit } from '@angular/core';
import { NodesService } from '../../services/nodes.service';

@Component({
  selector: 'app-stats',
  templateUrl: './stats.page.html',
  styleUrls: ['./stats.page.scss'],
})
export class StatsPage implements OnInit {

  constructor(public nodesService: NodesService) { }

  ngOnInit() {
  }

  ionViewDidEnter() {
  }

  updateStats(event) {
    setTimeout(() => {
      this.nodesService.fetchStats().then(() => {
        event.target.complete();
      });
    }, 2000);
  }

  //// Define Values ////
  fixHeight(): string {
    return this.nodesService.currentHeight.toLocaleString().split(/\s/).join(',');
  }

  fixTotalVotes(): string {
    const removeDecimals = Number(this.nodesService.totalVotes).toFixed(0);
    return parseInt(removeDecimals).toLocaleString().split(/\s/).join(',');
  }

  fixTotalEla(): string {
    let ela: number = parseFloat(this.nodesService.voters.ELA);
    return ela.toLocaleString().split(/\s/).join(',');
  }

  fixTotalVoters(): string {
    return this.nodesService.voters.total.toLocaleString().split(/\s/).join(',');
  }

  fixActiveAddresses(): string {
    return this.nodesService.mainchain.activeaddresses.toLocaleString().split(/\s/).join(',');
  }

  fixSupply(): string {
    let supply: number = parseFloat(this.nodesService.price.circ_supply);
    return supply.toLocaleString().split(/\s/).join(',');
  }

  fixVolume(): string {
    let volume: number = parseFloat(this.nodesService.price.volume);
    return volume.toLocaleString().split(/\s/).join(',');
  }
}
