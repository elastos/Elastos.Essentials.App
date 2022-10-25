import { Component, OnDestroy } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import moment from 'moment';
import { OptionsComponent } from 'src/app/launcher/components/options/options.component';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { Logger } from 'src/app/logger';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { WidgetBase } from '../../base/widgetbase';

@Component({
  selector: 'widget-identity',
  templateUrl: './identity.widget.html',
  styleUrls: ['./identity.widget.scss'],
})
export class IdentityWidget extends WidgetBase implements OnDestroy {
  private popover: HTMLIonPopoverElement = null;

  constructor(
    public theme: GlobalThemeService,
    public didService: DIDManagerService,
    private nav: GlobalNavService,
    private popoverCtrl: PopoverController
  ) {
    super();
    this.notifyReadyToDisplay();
  }

  ngOnDestroy() {
    console.log("IDENTITY TODO DISMISS POPOVER ON EXIT")
  }

  public getSignedInIdentity(): IdentityEntry {
    return this.didService.signedIdentity;
  }

  showMyIdentity() {
    void this.nav.navigateTo("identity", '/identity/myprofile/home');
  }

  getDateFromNow() {
    // return moment().format('dddd MMM Do') + ', ' + moment().format('LT');
    return moment().format('dddd, MMM Do');
  }

  /************** Show App/Identity Options **************/
  async showOptions(ev: any) {
    Logger.log('Launcher', 'Opening options');

    ev.preventDefault();
    ev.stopPropagation();

    this.popover = await this.popoverCtrl.create({
      mode: 'ios',
      component: OptionsComponent,
      componentProps: {
      },
      cssClass: !this.theme.activeTheme.value.config.usesDarkMode ? 'launcher-options-component' : 'launcher-options-component-dark',
      event: ev,
      translucent: false
    });
    void this.popover.onWillDismiss().then(() => {
      this.popover = null;
    });
    return await this.popover.present();
  }
}
