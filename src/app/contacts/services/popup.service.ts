import { Injectable, NgZone } from '@angular/core';
import { ModalController, PopoverController } from '@ionic/angular';
import { Logger } from 'src/app/logger';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { DeleteComponent } from '../components/delete/delete.component';
import { OptionsComponent } from '../components/options/options.component';
import { QRCodeComponent } from '../components/qrcode/qrcode.component';
import { Contact } from '../models/contact.model';
import { FriendsService } from './friends.service';
import { UxService } from './ux.service';

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
    private events: GlobalEvents
  ) {
    this.events.subscribe('showDeleteContactPrompt', (contact) => {
      this.zone.run(() => {
        void this.showDeletePrompt(contact);
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
    const targetContact = this.friendsService.getContact(contact.id);
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
        qrCodeString: this.uxService.getAddFriendShareableUrl(contact.id, contact.notificationsCarrierAddress),
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
