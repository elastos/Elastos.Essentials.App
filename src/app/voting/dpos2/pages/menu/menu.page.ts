import { Component, OnInit } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { DPoS2Service } from '../../services/dpos2.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
})
export class MenuPage implements OnInit {

  constructor(
    public theme: GlobalThemeService,
    public dpos2Service: DPoS2Service
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
  }

}
