import { Component, OnInit, ViewChild } from "@angular/core";
import { IonTabs } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import { GlobalThemeService } from "src/app/services/global.theme.service";
import { UXService } from "../../services/ux.service";

@Component({
  selector: "app-tabnav",
  templateUrl: "./tabnav.page.html",
  styleUrls: ["./tabnav.page.scss"],
})
export class TabnavPage implements OnInit {
  @ViewChild("tabs", { static: false }) tabs: IonTabs;
  constructor(
    public theme: GlobalThemeService,
    public translate: TranslateService,
    public UX: UXService
  ) { }

  public selectedTab: string;

  ngOnInit() {
    this.selectedTab = "home";
  }

  ionViewWillEnter() {
    //titleBarManager.setTitle(this.translate.instant('identity'));
    this.UX.setTitleBarSettingsKeyShown(true);
    this.UX.setTitleBarBackKeyShown(false);
  }

  ionViewWillLeave() {
    this.UX.setTitleBarSettingsKeyShown(false);
  }

  setCurrentTab() {
    this.selectedTab = this.tabs.getSelected();
    console.log(this.selectedTab);
  }
}
