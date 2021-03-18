import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PopoverController, NavParams } from '@ionic/angular';

import { FriendsService } from '../../services/friends.service';

import { Contact } from '../../models/contact.model';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Logger } from 'src/app/logger';

@Component({
  selector: 'app-delete',
  templateUrl: './delete.component.html',
  styleUrls: ['./delete.component.scss'],
})
export class DeleteComponent implements OnInit {

  @Output() cancelEvent = new EventEmitter<boolean>();

  public contact: Contact;

  constructor(
    public friendsService: FriendsService,
    private popover: PopoverController,
    private navParams: NavParams,
    public translate: TranslateService,
    public theme: GlobalThemeService
  ) { }

  ngOnInit() {
    this.contact = this.navParams.get('contact');
    Logger.log('contacts', 'Delete Prompt for ', this.contact);
  }

  deleteFriend() {
    this.friendsService.deleteContact(this.contact);
    this.popover.dismiss();
  }

  cancel() {
    this.popover.dismiss();
  }
}
