import { Component, OnInit } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { BuiltInIcon, TitleBarMenuItem } from '../titlebar/titlebar.types';

@Component({
  selector: 'app-titlebarmenuitem',
  templateUrl: './titlebarmenuitem.component.html',
  styleUrls: ['./titlebarmenuitem.component.scss'],
})
export class TitlebarmenuitemComponent implements OnInit {

  public menuItems: TitleBarMenuItem[] = [];
  public menuTitle: string = null;

  constructor(
    private navParams: NavParams,
    public theme: GlobalThemeService,
    private popoverCtrl: PopoverController,
  ) { }

  ngOnInit() {
    this.menuItems = this.navParams.get('items');
    this.menuTitle = this.navParams.get('title');
  }

  onTitlebarMenuItemClicked(item: TitleBarMenuItem) {
    void this.popoverCtrl.dismiss({
      item: item
    });
  }

  getIconPath(icon) {
    switch (icon) {
      case BuiltInIcon.ELASTOS:
        return !this.theme.darkMode ? 'assets/components/titlebar/elastos.svg' : 'assets/components/titlebar/darkmode/elastos.svg';
      case BuiltInIcon.BACK:
        return !this.theme.darkMode ? 'assets/components/titlebar/back.svg' : 'assets/components/titlebar/darkmode/back.svg';
      case BuiltInIcon.CLOSE:
        return !this.theme.darkMode ? 'assets/components/titlebar/close.svg' : 'assets/components/titlebar/darkmode/close.svg';
      case BuiltInIcon.SCAN:
        return !this.theme.darkMode ? 'assets/components/titlebar/scan.svg' : 'assets/components/titlebar/darkmode/scan.svg';
      case BuiltInIcon.ADD:
        return !this.theme.darkMode ? 'assets/components/titlebar/add.svg' : 'assets/components/titlebar/darkmode/add.svg';
      case BuiltInIcon.DELETE:
        return !this.theme.darkMode ? 'assets/components/titlebar/delete.svg' : 'assets/components/titlebar/darkmode/delete.svg';
      case BuiltInIcon.SETTINGS:
        return !this.theme.darkMode ? 'assets/components/titlebar/settings.svg' : 'assets/components/titlebar/darkmode/settings.svg';
      case BuiltInIcon.HELP:
        return !this.theme.darkMode ? 'assets/components/titlebar/help.svg' : 'assets/components/titlebar/darkmode/help.svg';
      case BuiltInIcon.HORIZONTAL_MENU:
        return !this.theme.darkMode ? 'assets/components/titlebar/horizontal_menu.svg' : 'assets/components/titlebar/darkmode/horizontal_menu.svg';
      case BuiltInIcon.VERTICAL_MENU:
        return !this.theme.darkMode ? 'assets/components/titlebar/vertical_menu.svg' : 'assets/components/titlebar/darkmode/vertical_menu.svg';
      case BuiltInIcon.EDIT:
        return !this.theme.darkMode ? 'assets/components/titlebar/edit.svg' : 'assets/components/titlebar/darkmode/edit.svg';
      case BuiltInIcon.FAVORITE:
        return !this.theme.darkMode ? 'assets/components/titlebar/favorite.svg' : 'assets/components/titlebar/darkmode/favorite.svg';
      default:
        return icon;
    }
  }

}
