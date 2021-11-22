import { Component, OnInit } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
})
export class MenuPage implements OnInit {

  constructor(
    public theme: GlobalThemeService
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
  }

}
