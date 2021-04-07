import { Component, OnInit, ViewChild } from "@angular/core";
import { IonTabs, NavController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import { GlobalThemeService } from "src/app/services/global.theme.service";
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarNavigationMode, BuiltInIcon, TitleBarIconSlot } from 'src/app/components/titlebar/titlebar.types';
import { Router } from "@angular/router";
import { Logger } from "src/app/logger";

@Component({
  selector: "app-tabnav",
  templateUrl: "./tabnav.page.html",
  styleUrls: ["./tabnav.page.scss"],
})
export class TabnavPage implements OnInit {
  @ViewChild("tabs", { static: true }) tabs: IonTabs;

  constructor(
    public theme: GlobalThemeService,
    public translate: TranslateService,
    private navCtrl: NavController,
    public router: Router
  ) { }

  public selectedTab: string;

  ngOnInit() {
    this.selectedTab = "home";
  }

  ionViewWillEnter() {
  }

  ionViewWillLeave() {
    //this.titleBar.setNavigationMode(null);
  }

  setCurrentTab() {
    this.selectedTab = this.tabs.getSelected();
    Logger.log('Identity', this.selectedTab);
  }
}
