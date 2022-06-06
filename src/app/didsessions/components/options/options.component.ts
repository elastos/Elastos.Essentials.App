import { Component, OnInit } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'app-options',
  templateUrl: './options.component.html',
  styleUrls: ['./options.component.scss'],
})
export class OptionsComponent implements OnInit {
  public identityEntry: IdentityEntry;

  constructor(
    private navParams: NavParams,
    public theme: GlobalThemeService,
    public translate: TranslateService,
    private popoverCtrl: PopoverController,
    private events: Events
  ) { }

  ngOnInit() {
    this.identityEntry = this.navParams.get('identityEntry');
    Logger.log('didsessions', 'Identity', this.identityEntry);
  }

  signIn() {
    void this.popoverCtrl.dismiss();
    this.events.publish('signIn', this.identityEntry);
  }

  showWarning() {
    void this.popoverCtrl.dismiss();
    this.events.publish('showDeleteIdentityPrompt', this.identityEntry);
  }
}
