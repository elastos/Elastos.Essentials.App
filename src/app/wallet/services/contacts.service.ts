import { Injectable } from '@angular/core';
import { LocalStorage } from './storage.service';
import { HttpClient } from '@angular/common/http';
import * as CryptoAddressResolvers from '../model/address-resolvers';
import { StandardCoinName } from '../model/Coin';

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
      this.storage.getContacts().then((contacts) => {
        console.log("Fetched stored contacts", contacts);
        if (contacts) {
          let contactsChecked = 0;
          this.contacts.forEach(async (contact) => {
            const cryptoNameResolver = new CryptoAddressResolvers.CryptoNameResolver(this.http);
            const results: CryptoAddressResolvers.Address[] = await cryptoNameResolver.resolve(contact.cryptoname, StandardCoinName.ELA);
            contactsChecked++;

            if (results) {
              contact.address = results[0].address;
            }
            if (contactsChecked === contacts.length) {
              this.storage.setContacts(this.contacts);
            }
          });
          this.contacts = contacts;
        }
        resolve();
      });
    });
  }
}
