import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Contact, ContactsService } from '../../services/contacts.service';

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
    void this.modalCtrl.dismiss({
      contact: contact
    });
  }
}
