import { Component, OnInit, NgZone } from '@angular/core';
import { ContactsService, Contact } from '../../services/contacts.service';
import { ModalController } from '@ionic/angular';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.scss'],
})
export class ContactsComponent implements OnInit {

  constructor(
    public contactsService: ContactsService,
    public theme: GlobalThemeService,
    public modalCtrl: ModalController,
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
  }

  ionViewWillLeave() {
  }

  selectContact(contact: Contact) {
    this.modalCtrl.dismiss({
      contact: contact
    });
  }
}
