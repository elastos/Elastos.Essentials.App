import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { AnySubWallet } from '../../model/networks/base/subwallets/subwallet';
import { Contact, ContactsService } from '../../services/contacts.service';

type CryptoAddressInfo = {
  cryptoname: string;
  type: string;
  address: string;
  resolver: string;
}

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.scss'],
})
export class ContactsComponent implements OnInit {

  public supportedCryptoAddresses: CryptoAddressInfo[] = [];
  private subWallet: AnySubWallet = null;

  constructor(
    public contactsService: ContactsService,
    public theme: GlobalThemeService,
    public modalCtrl: ModalController,
    private navParams: NavParams,
  ) {
    this.subWallet = this.navParams.get('subWallet');
  }

  ngOnInit() {
    void this.getContacts(this.subWallet)
  }

  ionViewWillEnter() {
  }

  ionViewWillLeave() {
  }

  async getContacts(subWallet: AnySubWallet) {
    for (let index = 0; index < this.contactsService.contacts.length; index++) {
      let addresses = this.contactsService.contacts[index].addresses;
      for (let i = 0; i < addresses.length; i++) {
        let valid = subWallet ? await subWallet.isAddressValid(addresses[i].address) : true;
        if (valid) {
          this.supportedCryptoAddresses.push({
            cryptoname: this.contactsService.contacts[index].cryptoname,
            type: addresses[i].type,
            address: addresses[i].address,
            resolver: this.contactsService.contacts[index].type
          })
        }
      }
    }
  }

  selectContact(contact: Contact) {
    void this.modalCtrl.dismiss({
      contact: contact
    });
  }
}
