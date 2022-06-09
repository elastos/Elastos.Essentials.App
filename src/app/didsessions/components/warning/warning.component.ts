import { Component, OnInit } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { Events } from 'src/app/services/events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

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
    void this.popoverCtrl.dismiss();
  }

  deleteDID() {
    void this.popoverCtrl.dismiss();
    this.events.publish('deleteIdentity', this.identityEntry);
  }
}
