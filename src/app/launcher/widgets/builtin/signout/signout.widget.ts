import { Component } from '@angular/core';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { GlobalAppBackgroundService } from 'src/app/services/global.appbackground.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Widget } from '../../base/widget.interface';

@Component({
  selector: 'widget-signout',
  templateUrl: './signout.widget.html',
  styleUrls: ['./signout.widget.scss'],
})
export class SignOutWidget implements Widget {
  public forSelection: boolean; // Initialized by the widget service

  constructor(
    public theme: GlobalThemeService,
    public didService: DIDManagerService,
    private appBackGroundService: GlobalAppBackgroundService
  ) { }

  public getSignedInIdentity(): IdentityEntry {
    return this.didService.signedIdentity;
  }

  async signOut() {
    await this.appBackGroundService.stop();
    await this.didService.signOut();
  }
}
