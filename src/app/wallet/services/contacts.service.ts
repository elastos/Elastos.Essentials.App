import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import * as CryptoAddressResolvers from '../model/address-resolvers';
import { StandardCoinName } from '../model/coin';
import { LocalStorage } from './storage.service';

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

  setContacts(): Promise<void> {
    return this.storage.setContacts(this.contacts);
  }

  getContacts() {
    return new Promise<void>((resolve, reject) => {
      void this.storage.getContacts().then(async (contacts) => {
        Logger.log('wallet', "Fetched stored contacts", contacts);
        if (contacts) {
          this.contacts = contacts;
          let contactsChecked = 0;
          let needUpdate = false;
          const cryptoNameResolver = new CryptoAddressResolvers.CryptoNameResolver(this.http);
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          for (let index = 0; index < contacts.length; index++) {
            let contact = contacts[index];
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
          }
        }
        resolve();
      });
    });
  }
}
