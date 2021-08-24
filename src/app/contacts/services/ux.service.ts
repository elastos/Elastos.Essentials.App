import { Injectable } from '@angular/core';
import { Contact } from '../models/contact.model';
import { TranslateService } from '@ngx-translate/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Injectable({
  providedIn: 'root'
})
export class UxService {

  constructor(
    private translate: TranslateService,
    private theme: GlobalThemeService
  ) { }

  getAvatar(contact: Contact) {
    if(contact.avatarLocal) {
      return 'data:'+contact.avatarLocal.contentType+';base64,'+contact.avatarLocal.data;
    } else if(contact.credentials.avatar && !contact.avatarLocal) {
      return 'data:'+contact.credentials.avatar.contentType+';base64,'+contact.credentials.avatar.data;
    } else {
      return !this.theme.darkMode ? 'assets/launcher/default/default-avatar.svg' : 'assets/launcher/default/darkmode/default-avatar.svg';
    }
  }

  getDisplayableName(contact: Contact): string {
    if(contact.credentials.name && contact.customName || !contact.credentials.name && contact.customName) {
      return contact.customName;
    } else if(contact.credentials.name && !contact.customName) {
      return contact.credentials.name;
    } else {
      return this.translate.instant('contacts.anonymous-contact');
    }
  }

  getDisplayableBio(contact: Contact): string {
    if(contact.customNote) {
      return contact.customNote;
    } else if(contact.credentials.description) {
      return contact.credentials.description
    } else {
      return contact.id.slice(4,16) + '...' + contact.id.slice(40,46);
    }
  }

  contactHasName(contact: Contact, letter: string): boolean {
    if(
      // Has name, has custom name
      contact.credentials.name && contact.customName && contact.customName[0].toUpperCase() === letter && contact.customName !== 'Anonymous Contact' ||
      // No name, has custom name
      !contact.credentials.name && contact.customName && contact.customName[0].toUpperCase() === letter && contact.customName !== 'Anonymous Contact' ||
      // Has name, no custom name
      contact.credentials.name && !contact.customName && contact.credentials.name[0].toUpperCase() === letter
    ) {
      return true;
    } else {
      return false;
    }
  }

  public async getAddFriendShareableUrl(didString: string, carrierString?: string): Promise<string> {
    let addFriendUrl = "https://contact.elastos.net/addfriend?did="+encodeURIComponent(didString);
    carrierString ? addFriendUrl += "&carrier="+carrierString : addFriendUrl;
    return addFriendUrl;
  }
}
