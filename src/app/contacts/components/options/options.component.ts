import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { Contact } from '../../models/contact.model';
import { DidService } from '../../services/did.service';
import { FriendsService } from '../../services/friends.service';



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
    public events: GlobalEvents,
  ) { }

  ngOnInit() {
    this.contact = this.navParams.get('contact');
    Logger.log('contacts', 'Options ', this.contact);
  }

  deleteContact() {
    this.events.publish('showDeleteContactPrompt', this.contact);
    void this.popover.dismiss();
  }
}
