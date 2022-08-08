import { Component, OnDestroy } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import moment from 'moment';
import { OptionsComponent } from 'src/app/launcher/components/options/options.component';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { Logger } from 'src/app/logger';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { AppTheme, GlobalThemeService } from 'src/app/services/global.theme.service';
import { Widget } from '../../base/widget.interface';

@Component({
  selector: 'widget-identity',
  templateUrl: './identity.widget.html',
  styleUrls: ['./identity.widget.scss'],
})
export class IdentityWidget implements Widget, OnDestroy {
  public forSelection: boolean; // Initialized by the widget service

  private popover: HTMLIonPopoverElement = null;

  constructor(
    public theme: GlobalThemeService,
    public didService: DIDManagerService,
    private nav: GlobalNavService,
    private popoverCtrl: PopoverController
  ) { }

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

    this.popover = await this.popoverCtrl.create({
      mode: 'ios',
      component: OptionsComponent,
      componentProps: {
      },
      cssClass: this.theme.activeTheme.value == AppTheme.LIGHT ? 'launcher-options-component' : 'launcher-options-component-dark',
      event: ev,
      translucent: false
    });
    void this.popover.onWillDismiss().then(() => {
      this.popover = null;
    });
    return await this.popover.present();
  }
}
