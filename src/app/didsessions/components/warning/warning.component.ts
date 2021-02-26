import { Component, OnInit } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { PopoverController, NavParams } from '@ionic/angular';
import { Events } from 'src/app/didsessions/services/events.service';
import { IdentityEntry } from 'src/app/services/didsessions.service';

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
    private events: Events
  ) { }

  ngOnInit() {
    this.identityEntry = this.navParams.get('identityEntry');
    console.log('Identity', this.identityEntry);
  }

  cancel() {
    this.popoverCtrl.dismiss();
  }

  deleteDID() {
    this.popoverCtrl.dismiss();
    this.events.publish( 'deleteIdentity', this.identityEntry);
  }
}
