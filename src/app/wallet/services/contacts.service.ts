import { Injectable } from '@angular/core';
import { LocalStorage } from './storage.service';
import { HttpClient } from '@angular/common/http';
import * as CryptoAddressResolvers from '../model/address-resolvers';
import { StandardCoinName } from '../model/Coin';
import { Logger } from 'src/app/logger';

export type Contact = {
  cryptoname: string;
  address: string;
};

@Injectable({
  providedIn: 'root'
})

export class ContactsService {

  public contacts: Contact[] = [];

  constructor(
    private storage: LocalStorage,
    private http: HttpClient
  ) { }

  async init() {
    await this.getContacts();
  }

  setContacts() {
    this.storage.setContacts(this.contacts);
  }

  getContacts() {
    return new Promise<void>((resolve, reject) => {
      void this.storage.getContacts().then((contacts) => {
        Logger.log('wallet', "Fetched stored contacts", contacts);
        if (contacts) {
          this.contacts = contacts;
          let contactsChecked = 0;
          let needUpdate = false;
          const cryptoNameResolver = new CryptoAddressResolvers.CryptoNameResolver(this.http);
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          contacts.forEach(async (contact, index) => {
            if (contact.cryptoname.startsWith('CryptoName: ')) {
              contact.cryptoname = contact.cryptoname.replace('CryptoName: ', '')
              needUpdate = true;
            }
            const results: CryptoAddressResolvers.Address[] = await cryptoNameResolver.resolve(contact.cryptoname, StandardCoinName.ELA);
            contactsChecked++;
            if (results && results[0]) {
              contact.address = results[0].address;
              needUpdate = true;
            }
            else {
              this.contacts.splice(index, 1);
            }
            if ((contactsChecked === contacts.length) && needUpdate) {
              void this.storage.setContacts(this.contacts);
            }
          });
        }
        resolve();
      });
    });
  }
}
