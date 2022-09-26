import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { Contact } from '../../models/contact.model';
import { FriendsService } from '../../services/friends.service';



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

  async deleteFriend() {
    await this.friendsService.deleteContact(this.contact);
    void this.popover.dismiss();
  }

  cancel() {
    void this.popover.dismiss();
  }
}
