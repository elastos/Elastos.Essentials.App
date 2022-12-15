import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { AnySubWallet } from '../../model/networks/base/subwallets/subwallet';
import { WalletUtil } from '../../model/wallet.util';
import { ContactsService } from '../../services/contacts.service';
import { Native } from '../../services/native.service';
import { WarningComponent } from '../warning/warning.component';

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
    private popoverCtrl: PopoverController,
    public translate: TranslateService
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
    this.supportedCryptoAddresses = [];
    for (let index = 0; index < this.contactsService.contacts.length; index++) {
      let addresses = this.contactsService.contacts[index].addresses;
      for (let i = 0; i < addresses.length; i++) {
        let valid = await this.isAddressValid(subWallet, addresses[i].address);
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

  private async isAddressValid(subWallet: AnySubWallet, address: string) {
    if (subWallet) {
        return await subWallet.isAddressValid(address);
    } else {
        // Multi-sign wallet transfer to ESC or EID.
        return WalletUtil.isEVMAddress(address);
    }
}

  selectContact(contact: CryptoAddressInfo) {
    void this.modalCtrl.dismiss({
      contact: contact
    });
  }

  getResolverLogo(contact: CryptoAddressInfo) {
    let logo = '';
    switch (contact.resolver) {
        case 'ENS':
            logo = 'assets/wallet/logos/ENS.svg';
        break;
        case 'ELADomain':
            logo = 'assets/wallet/logos/eladomain.svg';
        break;
        case 'Idriss':
            logo = 'assets/wallet/logos/idriss.png';
        break;
        case 'UnstoppableDomains':
            logo = 'assets/wallet/logos/unstoppableDomains.png';
        break;
        default:
            logo = 'assets/wallet/logos/cryptoname.png';
        break;
    }
    return logo;
  }

  async showDeletePrompt(contact: CryptoAddressInfo) {

    let popover = await this.popoverCtrl.create({
        mode: 'ios',
        cssClass: 'wallet-warning-component',
        component: WarningComponent,
        componentProps: {
            title: this.translate.instant('wallet.delete-contact-confirm-title'),
            message: contact.cryptoname + " " + contact.type + " " + contact.resolver
        },
        translucent: false
    });

    popover.onWillDismiss().then(async (params) => {
        if (params && params.data && params.data.confirm) {
            await this.deleteContact(contact);
        }
    });

    return await popover.present();
  }

  deleteContact(contact: CryptoAddressInfo) {
    let contactIndex = this.contactsService.contacts.findIndex( c => {
        return (c.cryptoname === contact.cryptoname) && (c.type == contact.resolver);
    })
    if (contactIndex > -1) {
        let contactFind = this.contactsService.contacts[contactIndex];
        if (contactFind.addresses.length === 1) {
            this.contactsService.contacts.splice(contactIndex, 1);
        } else {
            let addressIndex = contactFind.addresses.findIndex( c => {
                return c.address === contact.address
            })
            if (addressIndex > -1) {
                contactFind.addresses.splice(addressIndex, 1);
            }
        }
    }

    contactIndex = this.supportedCryptoAddresses.findIndex( c => {
        return (c.cryptoname === contact.cryptoname) && (c.address === contact.address) && (c.resolver === contact.resolver);
    })
    if (contactIndex > -1) {
        this.supportedCryptoAddresses.splice(contactIndex, 1)
    }

    // save
    this.contactsService.setContacts()
  }

    async updateContact() {
        await Native.instance.showLoading();
        try {
            await this.contactsService.getContacts();
            void this.getContacts(this.subWallet)
        } catch (e) {
            Logger.warn('wallet', 'updateContact exception:', e)
        }
        await Native.instance.hideLoading();
    }
}
