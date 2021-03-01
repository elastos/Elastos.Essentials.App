import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PopoverController, NavParams } from '@ionic/angular';

import { FriendsService } from '../../services/friends.service';
import { DidService } from '../../services/did.service';

import { Contact } from '../../models/contact.model';
import { Events } from '../../services/events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'app-options',
  templateUrl: './options.component.html',
  styleUrls: ['./options.component.scss'],
})
export class OptionsComponent implements OnInit {

  @Output() cancelEvent = new EventEmitter<boolean>();

  public contact: Contact;

  constructor(
    public friendsService: FriendsService,
    public didService: DidService,
    private popover: PopoverController,
    private navParams: NavParams,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    public events: Events,
  ) { }

  ngOnInit() {
    this.contact = this.navParams.get('contact');
    console.log('Options ', this.contact);
  }

  async deleteContact() {
    this.events.publish( 'showDeletePrompt', this.contact );
    this.popover.dismiss();
  }
}
