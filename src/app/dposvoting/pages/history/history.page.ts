import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';

import { NodesService } from '../../services/nodes.service';
import { Vote } from '../../model/history.model';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
})
export class HistoryPage implements OnInit {

  public _votes: Vote[] = [];

  constructor(public nodesService: NodesService) { }

  ngOnInit() {
  }

  modDate(date) {
    return moment(date).format("MMM Do YY, h:mm:ss a");
  }
}
