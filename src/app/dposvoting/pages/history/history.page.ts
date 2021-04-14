import { Component, OnInit, ViewChild } from '@angular/core';
import * as moment from 'moment';

import { NodesService } from '../../services/nodes.service';
import { Vote } from '../../model/history.model';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
})
export class HistoryPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public _votes: Vote[] = [];

  constructor(public nodesService: NodesService, public theme: GlobalThemeService) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle('DPoS Voting');
    this.titleBar.setTheme('#732dcf', TitleBarForegroundMode.LIGHT);
    this.titleBar.setNavigationMode(null);
  }

  modDate(date) {
    return moment(date).format("MMM Do YY, h:mm:ss a");
  }
}
