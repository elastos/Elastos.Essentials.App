import { Component, OnInit } from '@angular/core';
import { GlobalThemeService } from '../../services/global.theme.service';
import { TitlebarService } from 'src/app/services/titlebar.service';
import { PopoverController } from '@ionic/angular';
import { TitlebarmenuitemComponent } from '../titlebarmenuitem/titlebarmenuitem.component';

@Component({
  selector: 'app-titlebar',
  templateUrl: './titlebar.component.html',
  styleUrls: ['./titlebar.component.scss'],
})
export class TitleBarComponent implements OnInit {

  public menu: any = null;

  constructor(
    public titlebarService: TitlebarService,
    public theme: GlobalThemeService,
    private popoverCtrl: PopoverController
  ) {
  }

  ngOnInit() { }

  async openMenu(ev) {
    this.menu = await this.popoverCtrl.create({
      mode: 'ios',
      component: TitlebarmenuitemComponent,
      componentProps: {
      },
      cssClass: !this.theme.darkMode ? 'options' : 'darkOptions',
      event: ev,
      translucent: false
    });
    this.menu.onWillDismiss().then(() => {
      this.menu = null;
    });
    return await this.menu.present();
  }
}
