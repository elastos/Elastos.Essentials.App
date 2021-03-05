import { Component, OnInit, ViewChild } from "@angular/core";
import { IonTabs, NavController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import { GlobalThemeService } from "src/app/services/global.theme.service";
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarNavigationMode, BuiltInIcon, TitleBarIconSlot } from 'src/app/components/titlebar/titlebar.types';

@Component({
  selector: "app-tabnav",
  templateUrl: "./tabnav.page.html",
  styleUrls: ["./tabnav.page.scss"],
})
export class TabnavPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
  @ViewChild("tabs", { static: false }) tabs: IonTabs;

  constructor(
    public theme: GlobalThemeService,
    public translate: TranslateService,
    private navCtrl: NavController
  ) { }

  public selectedTab: string;

  ngOnInit() {
    this.selectedTab = "home";
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant("my-identity"));
    this.titleBar.setNavigationMode(TitleBarNavigationMode.BACK);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
      key: "settings",
      iconPath: BuiltInIcon.SETTINGS
    });
  
    this.titleBar.addOnItemClickedListener((icon) => {
      if (icon.key == "settings") {
          this.navCtrl.navigateForward('/settings');
      }
    });
  }

  ionViewWillLeave() {
    this.titleBar.setNavigationMode(null);
  }

  setCurrentTab() {
    this.selectedTab = this.tabs.getSelected();
    console.log(this.selectedTab);
  }
}
