import { Component, OnInit, ViewChild } from "@angular/core";
import { IonTabs } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import { GlobalFirebaseService } from "src/app/services/global.firebase.service";
import { GlobalThemeService } from "src/app/services/theming/global.theme.service";

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
  ) {
    GlobalFirebaseService.instance.logEvent("identity_nav_enter");
  }

  public selectedTab: string;

  ngOnInit() {
    this.selectedTab = "home";
  }

  ionViewWillEnter() {
    void this.tabs.select(this.selectedTab);
  }

  ionViewWillLeave() {
    //this.titleBar.setNavigationMode(null);
  }

  setCurrentTab() {
    this.selectedTab = this.tabs.getSelected();
  }
}
