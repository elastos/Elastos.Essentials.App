import { Component } from '@angular/core';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { GlobalAppBackgroundService } from 'src/app/services/global.appbackground.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { WidgetBase } from '../../base/widgetbase';

@Component({
  selector: 'widget-signout',
  templateUrl: './signout.widget.html',
  styleUrls: ['./signout.widget.scss'],
})
export class SignOutWidget extends WidgetBase {
  constructor(
    public theme: GlobalThemeService,
    public didService: DIDManagerService,
    private appBackGroundService: GlobalAppBackgroundService
  ) {
    super();
    this.notifyReadyToDisplay();
  }

  public getSignedInIdentity(): IdentityEntry {
    return this.didService.signedIdentity;
  }

  async signOut() {
    await this.appBackGroundService.stop();
    await this.didService.signOut();
  }
}
