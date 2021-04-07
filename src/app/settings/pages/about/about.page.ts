import { Component, OnInit, ViewChild } from '@angular/core';
import { SettingsService } from '../../services/settings.service';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.page.html',
  styleUrls: ['./about.page.scss'],
})
export class AboutPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public version: string = "";
  public sections = [
    {
      type: 'developer',
      links: [
        {   title: 'Trinity Tech Co. Ltd', link: null },
        {   title: 'website', link: 'https://www.trinity-tech.io' },
        {   title: 'email', link: 'contact@trinity-tech.io' },
      ]
    },
    {
      type: 'see-also',
      links: [
        { title: 'visit', link: 'https://www.elastos.org' },
        { title: 'join', link: 'https://www.cyberrepublic.org' },
        { title: 'build', link: 'https://developer.elastos.org' },
        { title: 'contact', link: 'https://t.me/elastosbrowser' },
      ],
    },
  ]

  constructor(
    public settings: SettingsService,
    public theme: GlobalThemeService,
    public translate: TranslateService,
    private globalIntentService: GlobalIntentService,
  ) { }

  ngOnInit() {
    this.version = this.settings.version;
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('about-setting'));
  }

  ionViewWillLeave() {
  }

  openLink(item) {
    if(item.title === 'email') {
      return;
    } else {
      this.globalIntentService.sendIntent('openurl', { url: item.link });
    }
  }
}
