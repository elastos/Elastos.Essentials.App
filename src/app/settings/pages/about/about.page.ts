import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.page.html',
  styleUrls: ['./about.page.scss'],
})
export class AboutPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public version = "";
  public sections = [
    {
      type: 'settings.developer',
      links: [
        { title: 'Trinity Tech Co. Ltd', link: null },
        { title: 'common.website', link: 'https://www.trinity-tech.io' },
        { title: 'common.email', link: 'contact@trinity-tech.io' },
      ]
    },
    {
      type: 'settings.see-also',
      links: [
        { title: 'settings.visit', link: 'https://elastos.info' },
        { title: 'settings.join', link: 'https://www.cyberrepublic.org' },
        { title: 'settings.build', link: 'https://elastos.dev' },
        { title: 'Elastos Discord', link: 'https://discord.gg/FGdF7CRAZr' },
      ],
    },
  ];

  public checkingVersion = true;
  public checkVersionError = false;
  public newerVersion: string = null; // eg: 2.6.1 - null if user has the latest version

  constructor(
    public settings: SettingsService,
    public theme: GlobalThemeService,
    public translate: TranslateService,
    private globalIntentService: GlobalIntentService
  ) { }

  ngOnInit() {
    this.version = this.settings.version;

    // Check version
    void this.settings.fetchVersionInfo().then(checkedVersion => {
      this.checkingVersion = false;

      if (!checkedVersion)
        this.checkVersionError = true;
      else {
        if (checkedVersion.shouldUpdate)
          this.newerVersion = checkedVersion.latestVersion;
        else
          this.newerVersion = null;
      }
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('settings.about-setting'));
  }

  ionViewWillLeave() {
  }

  openLink(item) {
    if (item.title === 'common.email') {
      return;
    } else {
      void this.globalIntentService.sendIntent('openurl', { url: item.link });
    }
  }

  public openAppUpdateUrl() {
    // Open in external browser
    void this.globalIntentService.sendIntent('openurl', { url: "https://edownload.web3essentials.io" });
  }

    async shareApp() {
        await this.globalIntentService.sendIntent("share", {
          title: this.translate.instant("settings.share-title"),
          url: 'https://d.web3essentials.io/',
        });
    }
}
