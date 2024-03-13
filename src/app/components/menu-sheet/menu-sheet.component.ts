import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { Stack } from "stack-typescript";

export type MenuSheetMenu = {
  icon?: string;
  title: string;
  subtitle?: string;
  items?: MenuSheetMenu[];
  routeOrAction?: string | (() => void | Promise<void>);
};

export type MenuSheetComponentOptions = {
  menu: MenuSheetMenu;
}

@Component({
  selector: 'app-menu-sheet',
  templateUrl: './menu-sheet.component.html',
  styleUrls: ['./menu-sheet.component.scss'],
  animations: [
    trigger('enterTrigger', [
      state('fadeIn', style({
        opacity: '1',
        transform: 'translateY(0%)'
      })),
      transition('void => *', [style({ opacity: '0', transform: 'translateY(50%)' }), animate('500ms')])
    ])
  ]
})
export class MenuSheetComponent implements OnInit {
  public menu: MenuSheetMenu = null;
  public selectedMenu: MenuSheetMenu = null;

  private navStack = new Stack<MenuSheetMenu>();

  constructor(
    private navParams: NavParams,
    public theme: GlobalThemeService,
    private modalCtrl: ModalController,
    private nav: GlobalNavService
  ) { }

  ngOnInit(): void {
    let options = this.navParams.data as MenuSheetComponentOptions;
    this.menu = options.menu;
    this.selectedMenu = this.menu;
  }

  ionViewWillEnter() {
  }

  public onMenuItemClicked(menuItem: MenuSheetMenu) {
    if (menuItem.items) {
      this.navStack.push(this.selectedMenu); // Saves the current menu to be able to go back
      this.selectedMenu = menuItem; // Enters the submenu
    }
    else {
      this.dismiss();

      if (typeof menuItem.routeOrAction === "string")
        void this.nav.navigateTo(null, menuItem.routeOrAction);
      else {
        void menuItem.routeOrAction();
      }
    }
  }

  public canGoBack(): boolean {
    return this.navStack.length > 0;
  }

  public goBack() {
    let previousMenu = this.navStack.pop();
    this.selectedMenu = previousMenu;
  }

  private dismiss() {
    void this.modalCtrl.dismiss();
  }
}
