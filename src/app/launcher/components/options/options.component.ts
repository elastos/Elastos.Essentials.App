import { Component, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { App } from 'src/app/model/app.enum';
import { GlobalAppBackgroundService } from 'src/app/services/global.appbackground.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from '../../../services/theming/global.theme.service';
import { DIDManagerService } from '../../services/didmanager.service';


@Component({
  selector: 'app-options',
  templateUrl: './options.component.html',
  styleUrls: ['./options.component.scss'],
})
export class OptionsComponent implements OnInit {

  constructor(
    public theme: GlobalThemeService,
    private didService: DIDManagerService,
    private popoverCtrl: PopoverController,
    private globalNavService: GlobalNavService,
    private appBackGroundService: GlobalAppBackgroundService
  ) { }

  ngOnInit() {
  }

  async manageIdentity() {
    await this.popoverCtrl.dismiss();
    void this.globalNavService.navigateTo(App.IDENTITY, "/identity/myprofile/home");
  }

  async signOut() {
    await this.popoverCtrl.dismiss();
    await this.appBackGroundService.stop();
    this.didService.signOut();
  }

  async shareIdentity() {
    await this.popoverCtrl.dismiss();
    void this.didService.shareIdentity();
  }
}
