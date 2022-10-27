import { Component, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { GlobalSecurityService } from 'src/app/services/global.security.service';
import { GlobalStartupService } from 'src/app/services/global.startup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';

@Component({
  selector: 'app-rootedwarning',
  templateUrl: './rootedwarning.component.html',
  styleUrls: ['./rootedwarning.component.scss'],
})
export class RootedWarningPage implements OnInit {
  constructor(
    public theme: GlobalThemeService,
    private popover: PopoverController,
    public translate: TranslateService,
    private globalSecurityService: GlobalSecurityService,
  ) { }

  ngOnInit() {
  }

  ionViewDidEnter() {
    GlobalStartupService.instance.setStartupScreenReady();
  }

  cancel() {
    void this.popover.dismiss();
  }

  confirm() {
    void this.globalSecurityService.setRootedDeviceWarningDismissed();
    GlobalStartupService.instance.navigateToFirstScreen();
  }
}
