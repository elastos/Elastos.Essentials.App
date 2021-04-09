import { Component, OnInit, ViewChild } from "@angular/core";
import { IonTabs } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import { GlobalThemeService } from "src/app/services/global.theme.service";
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
  ) { }

  public selectedTab: string;

  ngOnInit() {
    this.selectedTab = "home";
  }

  ionViewWillEnter() {
    this.tabs.select(this.selectedTab);
  }

  ionViewWillLeave() {
    //this.titleBar.setNavigationMode(null);
  }

  setCurrentTab() {
    this.selectedTab = this.tabs.getSelected();
    Logger.log('Identity', this.selectedTab);
  }
}
