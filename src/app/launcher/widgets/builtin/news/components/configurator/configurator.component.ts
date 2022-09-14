import { Component, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { GlobalAppBackgroundService } from 'src/app/services/global.appbackground.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';


@Component({
  selector: 'app-news-configurator',
  templateUrl: './configurator.component.html',
  styleUrls: ['./configurator.component.scss'],
})
export class NewsConfiguratorComponent implements OnInit {

  constructor(
    public theme: GlobalThemeService,
    private popoverCtrl: PopoverController,
    private globalNavService: GlobalNavService,
    private appBackGroundService: GlobalAppBackgroundService
  ) { }

  ngOnInit() {
  }
}
