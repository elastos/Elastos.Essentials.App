import { Component, OnInit } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { PopoverController, NavParams } from '@ionic/angular';
import { IdentityEntry } from 'src/app/services/global.didsessions.service';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-warning',
  templateUrl: './warning.component.html',
  styleUrls: ['./warning.component.scss'],
})
export class WarningComponent implements OnInit {
  public identityEntry: IdentityEntry;

  constructor(
    public theme: GlobalThemeService,
    private navParams: NavParams,
    private popoverCtrl: PopoverController,
    private events: Events,
    public translate: TranslateService
  ) { }

  ngOnInit() {
    this.identityEntry = this.navParams.get('identityEntry');
    Logger.log('didsessions', 'Identity', this.identityEntry);
  }

  cancel() {
    this.popoverCtrl.dismiss();
  }

  deleteDID() {
    this.popoverCtrl.dismiss();
    this.events.publish( 'deleteIdentity', this.identityEntry);
  }
}
