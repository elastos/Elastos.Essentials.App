import { Component, OnInit } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { PopoverController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Events } from '../../services/events.service';
import { IdentityEntry } from 'src/app/services/global.didsessions.service';

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
    console.log('Identity', this.identityEntry);
  }

  signIn() {
    this.popoverCtrl.dismiss();
    this.events.publish('signIn', this.identityEntry);
  }

  showWarning() {
    this.popoverCtrl.dismiss();
    this.events.publish('showDeletePrompt', this.identityEntry);
  }
}
