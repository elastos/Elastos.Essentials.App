import { Component, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { GlobalThemeService } from '../../../services/global.theme.service';
import { DIDManagerService } from '../../services/didmanager.service';
import { GlobalAppBackgroundService } from 'src/app/services/global.appbackground.service';


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
    private appBackGroundService: GlobalAppBackgroundService
  ) { }

  ngOnInit() {
  }

  async signOut() {
    this.popoverCtrl.dismiss();
    await this.appBackGroundService.stop();
    this.didService.signOut();
  }

  shareIdentity() {
    this.popoverCtrl.dismiss();
    this.didService.shareIdentity();
  }
}
