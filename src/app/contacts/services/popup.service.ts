import { Injectable, NgZone } from '@angular/core';
import { Contact } from '../models/contact.model';
import { PopoverController, ModalController } from '@ionic/angular';
import { DeleteComponent } from '../components/delete/delete.component';
import { FriendsService } from './friends.service';
import { OptionsComponent } from '../components/options/options.component';
import { UxService } from './ux.service';
import { QRCodeComponent } from '../components/qrcode/qrcode.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { DIDPublishingComponent } from 'src/app/components/did-publishing/did-publishing.component';

@Injectable({
  providedIn: 'root'
})
export class PopupService {

  // Controllers
  public deletePopup: any = null; // Delete Popover
  public optionsPopup: any = null; // Options Popover
  public avatarModal: any = null; // Avatar Modal
  public qrModal: any = null // QR Modal

  constructor(
    private popoverCtrl: PopoverController,
    private modalCtrl: ModalController,
    private friendsService: FriendsService,
    private uxService: UxService,
    private theme: GlobalThemeService,
    private zone: NgZone,
    private events: Events
  ) {
    this.events.subscribe('showDeleteContactPrompt', (contact) => {
      this.zone.run(() => {
        this.showDeletePrompt(contact);
      });
    });
  }

  async showDeletePrompt(contact: Contact) {
    this.deletePopup = await this.popoverCtrl.create({
      cssClass: 'contacts-warning-component',
      component: DeleteComponent,
      componentProps: {
        contact: contact
      }
    });
    this.deletePopup.onWillDismiss().then(() => {
      this.deletePopup = null;
    });
    return await this.deletePopup.present();
  }

  async showOptions(ev: any, contact: Contact, fromContactDetails?: boolean) {
    const targetContact = this.friendsService.contacts.find((_contact) => _contact.id === contact.id);
    Logger.log('contacts', 'Opening options for contact', targetContact);

    this.optionsPopup = await this.popoverCtrl.create({
      mode: 'ios',
      component: OptionsComponent,
      cssClass: !this.theme.darkMode ? 'options-component' : 'dark-options-component',
      event: ev,
      componentProps: {
        contact: contact,
        fromContactDetails: fromContactDetails ? true : false
      },
      translucent: false
    });
    this.optionsPopup.onWillDismiss().then(() => {
      this.optionsPopup = null;
    });
    return await this.optionsPopup.present();
  }

  async showQRCode(contact: Contact) {
    this.qrModal = await this.modalCtrl.create({
      component: QRCodeComponent,
      componentProps: {
        didString: contact.id,
        name: contact.customName ? contact.customName : contact.credentials.name,
        qrCodeString: await this.uxService.getAddFriendShareableUrl(contact.id, contact.notificationsCarrierAddress),
      },
      cssClass: !this.theme.darkMode ? 'contacts-qrcode-component' : 'contacts-qrcode-component-dark'
    });
    this.qrModal.onWillDismiss().then((params) => {
      this.qrModal = null
    });
    this.qrModal.present();
  }

  /*
  ONLY TO TEST DID-PUBLISHING COMPONENT 

   async showQRCode(contact: Contact) {
    this.qrModal = await this.modalCtrl.create({
      component: DIDPublishingComponent,
      cssClass: !this.theme.darkMode ? "identity-showqrcode-component identity-publishmode-component-base" : 'identity-showqrcode-component-dark identity-publishmode-component-base'
    });
    this.qrModal.present();
  } 
  
  */
}
