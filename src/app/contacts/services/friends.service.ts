import { Injectable, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NavigationExtras } from '@angular/router';
import { Clipboard } from '@ionic-native/clipboard/ngx';

import { NativeService } from './native.service';
import { StorageService } from './storage.service';

import { Contact } from '../models/contact.model';
import { Avatar } from '../models/avatar';
import { DidService } from './did.service';
import { Events } from './events.service';
import { ContactNotifierService, Contact as ContactNotifierContact } from 'src/app/services/contactnotifier.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';

declare let didManager: DIDPlugin.DIDManager;

@Injectable({
  providedIn: 'root'
})
export class FriendsService {

  // Pending contact
  public pendingContact: Contact = {
    id: null,
    didDocument: null,
    credentials: null,
    avatarLocal: null,
    customName: null,
    customNote: null,
    isPicked: false,
    isFav: false,
    carrierAddress: null,
    notificationsCarrierAddress: null
  };

  // Stored contacts
  public contacts: Contact[] = [];

  // For intents filtering contacts
  public filteredContacts: Contact[] = [];

  // For friends page avatar slider
  public activeSlide: Contact;

  // For sorting contacts by first letter
  public letters: string[] = [];

  // Set first contact for first visit
  public firstVisit = false;

  // Check contacts on app load for updates
  public contactsChecked = false;

  public contactsFetched = false;

  // Temporary storage for an invitation id from a received "viewfriendinviation" intent
  public contactNotifierInviationId: string = null;

  // For intents
  public managerService: any;
  public shareIntentData: {
    title: string,
    url?: string
  } = null;

  getContact(id: string) {
    return {...this.contacts.find(contact => contact.id === id)};
  }

  constructor(
    //private router: Router,
    //private navController: NavController,
    private globalNav: GlobalNavService,
    public zone: NgZone,
    private clipboard: Clipboard,
    public translate: TranslateService,
    private native: NativeService,
    public storageService: StorageService,
    private events: Events,
    private didService: DidService,
    private didSessions: GlobalDIDSessionsService,
    private contactNotifier: ContactNotifierService,
    private globalIntentService: GlobalIntentService,
  ) {
    this.managerService = this;
  }

  async init() {
      await this.getVisit();
      await this.getStoredContacts();
      this.getContactNotifierContacts();
  }



  /******************************************************
  * Get Visit, if first time, add a fake 'First Contact' *
  *******************************************************/
  async getVisit() {
    this.storageService.getVisit().then(async data => {
      if (!data) {
        await this.resolveDIDDocument('did:elastos:iXyYFboFAd2d9VmfqSvppqg1XQxBtX9ea2', false, null, false);
        this.storageService.setVisit(true);
      }
    });
  }

  /******************************
  **** Fetch Stored Contacts ****
  *******************************/
  getStoredContacts(): Promise<Contact[]> {
    return new Promise((resolve, reject) => {
      this.storageService.getContacts().then(contacts => {
        Logger.log("Contacts", 'Stored contacts fetched', contacts);
        this.contactsFetched = true;

        if(contacts) {
          this.contacts = contacts;
          this.sortContacts();
          resolve(contacts || []);

          if(!this.contactsChecked) {
            this.contactsChecked = true;
            this.contacts.forEach(async (contact) => {
              Logger.log("Contacts", 'Checking stored contacts for updates', contacts);
              contact.id !== 'did:elastos' ? await this.resolveDIDDocument(contact.id, true) : null;
            });
          }
        } else {
          Logger.log('contacts', "No stored contacts");
          resolve([]);
        }
      });
    });
  }

  /************************************************
  *** Add Unadded Contacts from Contact Notifier ***
  *************************************************/
  getContactNotifierContacts() {
    this.contactNotifier.getAllContacts().then((notifierContacts) => {
      Logger.log("Contacts", 'Found all Notifier Contacts', notifierContacts);
      notifierContacts.forEach((notifierContact) => {
        const alreadyAddedContact = this.contacts.find((contact) => contact.id === notifierContact.getDID());
        if(!alreadyAddedContact) {
          const contactAvatar = notifierContact.getAvatar();
          const newContact: Contact = {
            id: notifierContact.getDID(),
            didDocument: {
              clazz: null,
              id: {
                storeId: null,
                didString: notifierContact.getDID(),
              },
              created: null,
              updated: null,
              verifiableCredential: [],
              publicKey: null,
              authentication: null,
              authorization: null,
              expires: null,
              storeId: null,
            },
            credentials: {
              name: notifierContact.getName(),
              gender: null,
              nickname: null,
              nation: null,
              birthDate: null,
              birthPlace: null,
              occupation: null,
              education: null,
              telephone: null,
              email: null,
              interests: null,
              description: null,
              url: null,
              twitter: null,
              facebook: null,
              instagram: null,
              snapchat: null,
              telegram: null,
              wechat: null,
              weibo: null,
              twitch: null,
              elaAddress: null,
              avatar: contactAvatar && Object.getOwnPropertyNames(contactAvatar).length !== 0 ? Avatar.fromContactNotifierContactAvatar(contactAvatar) : null,
              applicationProfileCredentials: [],
            },
            avatarLocal: null,
            customName: null,
            customNote: null,
            isPicked: false,
            isFav: false,
            carrierAddress: notifierContact.getCarrierUserID(),
            notificationsCarrierAddress: null
          }

          this.contacts.push(newContact);
        } else {
          Logger.log('contacts', 'Contact Notifier Contact', alreadyAddedContact + ' is already added');
        }
      });

      this.saveContactsState();
    });
  }

  /************************************************
  *********** Add Friend By Scan Button ***********
  *************************************************/
  async scanDID() {
    let res = await this.globalIntentService.sendIntent("https://scanner.elastos.net/scanqrcode");
    Logger.log('contacts', "Got scan result", res);

    // Scanned content could contain different things:
    // - A did: did:elastos:xxxx
    // - A add friend url: https://contact.elastos.net/addfriend?did=xxx[&carrier=xxx]
    // - Something that we don't know
    let scannedContentHandled = false
    if (res && res.result && res.result.scannedContent) {
      let scannedContent = res.result.scannedContent;

      if (scannedContent.indexOf("did:") == 0) {
        // We've scanned a DID string. Add friend, without carrier address support
        Logger.log('contacts', "Scanned content is a DID string");
        this.addContactByIntent(scannedContent, null);
        scannedContentHandled = true;
      }
      else if (scannedContent.indexOf("http") == 0) {
        Logger.log('contacts', "Scanned content is a URL");
        // Probably a url - try to parse it and see if we can handle it
        let scannedUrl = new URL(scannedContent);
        Logger.log('contacts', scannedUrl);

        if (scannedUrl) {
          if (scannedUrl.pathname == "/addfriend") {
            let did = scannedUrl.searchParams.get("did");
            let carrierAddress = scannedUrl.searchParams.get("carrier");

            this.addContactByIntent(did, carrierAddress);
            scannedContentHandled = true;
          }
        }
      }
    }

    if (!scannedContentHandled) {
      this.native.genericToast(this.translate.instant('failed-read-scan'));
    }
  }

  /*******************************************
  *********** Add Contact By Intent ***********
  ********************************************/
  async addContactByIntent(did: string, carrierAddress?: string) {
    Logger.log('contacts', 'Received contact by intent', did, carrierAddress);

    if(await this.didService.getUserDID() === did) {
      this.native.genericToast('please-dont-add-self');
      this.globalNav.navigateRoot('contacts', '/contacts/friends');
    } else {
      const targetContact: Contact = this.contacts.find(contact => contact.id === did);
      if(targetContact) {
        const promptName = this.getPromptName(targetContact);

        if(carrierAddress) {
          this.contacts[this.contacts.indexOf(targetContact)].notificationsCarrierAddress = carrierAddress;
          this.storageService.setContacts(this.contacts);
          this.globalNav.navigateTo('contacts', '/contacts/friends/'+targetContact.id);
          this.native.genericToast(promptName + this.translate.instant('did-carrier-added'));
          Logger.log('contacts', 'Contact is already added but carrier address is updated', this.contacts[this.contacts.indexOf(targetContact)]);
        } else {
          this.native.genericToast(promptName + this.translate.instant('is-already-added'));
          this.globalNav.navigateTo('contacts', '/contacts/friends/'+targetContact.id);
          Logger.log('contacts', 'Contact is already added');
        }
      } else {
        this.native.showLoading('please-wait');
        this.resolveDIDDocument(did, false, carrierAddress);
      }
    }
  }

  /******************************************************************
   * From a DID string, try to resolve the published DID document
   * from the DID sidechain. That DID document may or may not include
   * BasicProfileCredential types credentials such as "name", "email",
   * "telephone", and also ApplicationProfileCredential type credentials
   * that have earlier been registered through "registerapplicationprofile"
   * intents, by the DID app, on request from third party apps. This is
   * where we can retrieve public app profile information for a "user" (DID).
  ****************************************************************************/
  resolveDIDDocument(
    didString: DIDPlugin.DIDString,
    updatingFriends: boolean,
    carrierAddress?: string,
    requiresConfirmation?: boolean,
  ): Promise<void> {
    Logger.log("Contacts",
      'Resolving DID document for DID string ', didString,
      'Updating friends?' + updatingFriends,
      'Requires confirmation?' + requiresConfirmation
    );
    return new Promise((resolve, reject) => {
      didManager.resolveDidDocument(didString, true, (didDocument: DIDPlugin.DIDDocument) => {
        Logger.log("Contacts", "DIDDocument resolved for DID " + didString, didDocument);

        if (didDocument && !updatingFriends) {
          this.buildPublishedContact(didDocument, carrierAddress, requiresConfirmation);
        } else if (didDocument && updatingFriends) {
          this.updateContact(didDocument);
        } else if (!didDocument && updatingFriends) {
          return;
        } else {
          this.native.genericToast(this.translate.instant('contact-is-unpublished'));
          this.buildUnpublishedContact(didString, carrierAddress, requiresConfirmation);
        }

        resolve();
      }, (err: any) => {
        Logger.error('contacts', "DIDDocument resolving error", err);
        this.native.didResolveErr(err.message);
        this.globalNav.navigateRoot('contacts', '/contacts/friends');
        resolve();
      });
    });
  }

  /************************************************
  ***** Update Contact's Credentials on App Load  *
  *************************************************/
  updateContact(newDoc) {
    this.contacts.map((contact) => {
      if(contact.id === newDoc.id.didString) {
        Logger.log("Contacts", 'Updating contact', contact);

        contact.didDocument = newDoc;
        newDoc.verifiableCredential.map(key => {
          if(key.credentialSubject.hasOwnProperty('name')) {
            contact.credentials.name = key.credentialSubject.name;
          }
          if(key.credentialSubject.hasOwnProperty('gender')) {
            contact.credentials.gender = key.credentialSubject.gender;
          }
          if(key.credentialSubject.hasOwnProperty('avatar')) {
            contact.credentials.avatar = Avatar.fromAvatarCredential(key.credentialSubject.avatar);
          }
          if(key.credentialSubject.hasOwnProperty('nickname')) {
            contact.credentials.nickname = key.credentialSubject.nickname;
          }
          if(key.credentialSubject.hasOwnProperty('nation')) {
            contact.credentials.nation = key.credentialSubject.nation;
          }
          if(key.credentialSubject.hasOwnProperty('birthDate')) {
            contact.credentials.birthDate = key.credentialSubject.birthDate;
          }
          if(key.credentialSubject.hasOwnProperty('birthPlace')) {
            contact.credentials.birthPlace = key.credentialSubject.birthPlace;
          }
          if(key.credentialSubject.hasOwnProperty('occupation')) {
            contact.credentials.occupation = key.credentialSubject.occupation;
          }
          if(key.credentialSubject.hasOwnProperty('education')) {
            contact.credentials.education = key.credentialSubject.education;
          }
          if(key.credentialSubject.hasOwnProperty('telephone')) {
            contact.credentials.telephone = key.credentialSubject.telephone;
          }
          if(key.credentialSubject.hasOwnProperty('email')) {
            contact.credentials.email = key.credentialSubject.email;
          }
          if(key.credentialSubject.hasOwnProperty('interests')) {
            contact.credentials.interests = key.credentialSubject.interests;
          }
          if(key.credentialSubject.hasOwnProperty('description')) {
            contact.credentials.description = key.credentialSubject.description;
          }
          if(key.credentialSubject.hasOwnProperty('url')) {
            contact.credentials.url = key.credentialSubject.url;
          }
          if(key.credentialSubject.hasOwnProperty('twitter')) {
            contact.credentials.twitter = key.credentialSubject.twitter;
          }
          if(key.credentialSubject.hasOwnProperty('facebook')) {
            contact.credentials.facebook = key.credentialSubject.facebook;
          }
          if(key.credentialSubject.hasOwnProperty('instagram')) {
            contact.credentials.instagram = key.credentialSubject.instagram;
          }
          if(key.credentialSubject.hasOwnProperty('snapchat')) {
            contact.credentials.snapchat = key.credentialSubject.snapchat;
          }
          if(key.credentialSubject.hasOwnProperty('telegram')) {
            contact.credentials.telegram = key.credentialSubject.telegram;
          }
          if(key.credentialSubject.hasOwnProperty('wechat')) {
            contact.credentials.wechat = key.credentialSubject.wechat;
          }
          if(key.credentialSubject.hasOwnProperty('weibo')) {
            contact.credentials.weibo = key.credentialSubject.weibo;
          }
          if(key.credentialSubject.hasOwnProperty('twitch')) {
            contact.credentials.twitch = key.credentialSubject.twitch;
          }
          if(key.credentialSubject.hasOwnProperty('elaAddress')) {
            contact.credentials.elaAddress = key.credentialSubject.elaAddress;
          }
          if(key.credentialSubject.hasOwnProperty('apppackage')) {
            contact.credentials.applicationProfileCredentials = [];
            contact.credentials.applicationProfileCredentials.push({
              action: key.credentialSubject.action,
              apppackage: key.credentialSubject.apppackage,
              apptype: key.credentialSubject.apptype,
            });
          }
        });

        this.saveContactsState();
        this.updateNotifierContact(contact);
      }
    });
  }

  /******************************************************
  ** Reset Pending Contact for Unresolved/Resolved DID **
  *******************************************************/
  resetPendingContact(didString: string, carrierString?: string) {
    this.pendingContact = {
      id: didString,
      didDocument: {
        clazz: null,
        id: {
          storeId: null,
          didString: didString
        },
        created: null,
        updated: null,
        verifiableCredential: [],
        publicKey: null,
        authentication: null,
        authorization: null,
        expires: null,
        storeId: null,
      },
      credentials: {
        name: null,
        gender: null,
        nickname: null,
        nation: null,
        birthDate: null,
        birthPlace: null,
        occupation: null,
        education: null,
        telephone: null,
        email: null,
        interests: null,
        description: null,
        url: null,
        twitter: null,
        facebook: null,
        instagram: null,
        snapchat: null,
        telegram: null,
        wechat: null,
        weibo: null,
        twitch: null,
        elaAddress: null,
        avatar: null,
        applicationProfileCredentials: [],
      },
      avatarLocal: null,
      customName: null,
      customNote: null,
      isPicked: false,
      isFav: false,
      carrierAddress: null,
      notificationsCarrierAddress: carrierString ? carrierString : null
    };
    Logger.log('contacts', 'Pending contact is reset', this.pendingContact);
  }

  /********************************************************
  **** Start Filling Pending Contact for Unresolved DID ***
  *********************************************************/
  buildUnpublishedContact(didString: string, carrierString?: string, requiresConfirmation?: boolean) {
    Logger.log('contacts', 'Building contact using unresolved DID for confirm-prompt', didString);
    this.resetPendingContact(didString, carrierString);

    if(requiresConfirmation === false) {
      this.contacts.push(this.pendingContact);
      this.saveContactsState();
    } else {
      this.showConfirmPrompt(false);
    }
  }

  /*******************************************************
  **** Start Filling Current Contact for Resolved DID *****
  *********************************************************/
  buildPublishedContact = (resolvedDidDocument, carrierString?: string, requiresConfirmation?: boolean) => {
    Logger.log('contacts', 'Building contact using resolved DID document for confirm-prompt', resolvedDidDocument);
    const resolvedDidString = resolvedDidDocument.id.didString;
    this.resetPendingContact(resolvedDidString, carrierString);

    this.pendingContact.didDocument = resolvedDidDocument;
    this.pendingContact.id = resolvedDidString;

    resolvedDidDocument.verifiableCredential.map(key => {
      if(key.credentialSubject.hasOwnProperty('name')) {
        Logger.log('contacts', 'Resolved DID has name');
        this.pendingContact.credentials.name = key.credentialSubject.name;
      }
      if(key.credentialSubject.hasOwnProperty('avatar')) {
        Logger.log('contacts', 'Resolved DID has avatar');
        this.pendingContact.credentials.avatar = Avatar.fromAvatarCredential(key.credentialSubject.avatar);
      }
      if(key.credentialSubject.hasOwnProperty('nickname')) {
        Logger.log('contacts', 'Resolved DID has nickname');
        this.pendingContact.credentials.nickname = key.credentialSubject.nickname;
      }
      if(key.credentialSubject.hasOwnProperty('gender')) {
        Logger.log('contacts', 'Resolved DID has gender');
        this.pendingContact.credentials.gender = key.credentialSubject.gender;
      }
      if(key.credentialSubject.hasOwnProperty('nation')) {
        Logger.log('contacts', 'Resolved DID has nation');
        this.pendingContact.credentials.nation = key.credentialSubject.nation;
      }
      if(key.credentialSubject.hasOwnProperty('birthDate')) {
        Logger.log('contacts', 'Resolved DID has birth date');
        this.pendingContact.credentials.birthDate = key.credentialSubject.birthDate;
      }
      if(key.credentialSubject.hasOwnProperty('birthPlace')) {
        Logger.log('contacts', 'Resolved DID has birth place');
        this.pendingContact.credentials.birthPlace = key.credentialSubject.birthPlace;
      }
      if(key.credentialSubject.hasOwnProperty('occupation')) {
        Logger.log('contacts', 'Resolved DID has occupation');
        this.pendingContact.credentials.occupation = key.credentialSubject.occupation;
      }
      if(key.credentialSubject.hasOwnProperty('education')) {
        Logger.log('contacts', 'Resolved DID has education');
        this.pendingContact.credentials.education = key.credentialSubject.education;
      }
      if(key.credentialSubject.hasOwnProperty('telephone')) {
        Logger.log('contacts', 'Resolved DID has telephone');
        this.pendingContact.credentials.telephone = key.credentialSubject.telephone;
      }
      if(key.credentialSubject.hasOwnProperty('email')) {
        Logger.log('contacts', 'Resolved DID has email');
        this.pendingContact.credentials.email = key.credentialSubject.email;
      }
      if(key.credentialSubject.hasOwnProperty('interests')) {
        Logger.log('contacts', 'Resolved DID has interests');
        this.pendingContact.credentials.interests = key.credentialSubject.interests;
      }
      if(key.credentialSubject.hasOwnProperty('description')) {
        Logger.log('contacts', 'Resolved DID has description');
        this.pendingContact.credentials.description = key.credentialSubject.description;
      }
      if(key.credentialSubject.hasOwnProperty('url')) {
        Logger.log('contacts', 'Resolved DID has website');
        this.pendingContact.credentials.url = key.credentialSubject.url;
      }
      if(key.credentialSubject.hasOwnProperty('twitter')) {
        Logger.log('contacts', 'Resolved DID has twitter');
        this.pendingContact.credentials.twitter = key.credentialSubject.twitter;
      }
      if(key.credentialSubject.hasOwnProperty('facebook')) {
        Logger.log('contacts', 'Resolved DID has facebook');
        this.pendingContact.credentials.facebook = key.credentialSubject.facebook;
      }
      if(key.credentialSubject.hasOwnProperty('instagram')) {
        Logger.log('contacts', 'Resolved DID has instagram');
        this.pendingContact.credentials.instagram = key.credentialSubject.instagram;
      }
      if(key.credentialSubject.hasOwnProperty('snapchat')) {
        Logger.log('contacts', 'Resolved DID has snapchat');
        this.pendingContact.credentials.snapchat = key.credentialSubject.snapchat;
      }
      if(key.credentialSubject.hasOwnProperty('telegram')) {
        Logger.log('contacts', 'Resolved DID has telegram');
        this.pendingContact.credentials.telegram = key.credentialSubject.telegram;
      }
      if(key.credentialSubject.hasOwnProperty('wechat')) {
        Logger.log('contacts', 'Resolved DID has wechat');
        this.pendingContact.credentials.wechat = key.credentialSubject.wechat;
      }
      if(key.credentialSubject.hasOwnProperty('weibo')) {
        Logger.log('contacts', 'Contact has weibo');
        this.pendingContact.credentials.weibo = key.credentialSubject.weibo;
      }
      if(key.credentialSubject.hasOwnProperty('twitch')) {
        Logger.log('contacts', 'Contact has twitch');
        this.pendingContact.credentials.twitch = key.credentialSubject.twitch;
      }
      if(key.credentialSubject.hasOwnProperty('elaAddress')) {
        Logger.log('contacts', 'Contact has ela wallet');
        this.pendingContact.credentials.elaAddress = key.credentialSubject.elaAddress;
      }
      if(key.credentialSubject.hasOwnProperty('apppackage')) {
        Logger.log('contacts', 'Contact has apps');
        this.pendingContact.credentials.applicationProfileCredentials.push({
          action: key.credentialSubject.action,
          apppackage: key.credentialSubject.apppackage,
          apptype: key.credentialSubject.apptype,
        });
      }
    });

    if(requiresConfirmation === false) {
      this.contacts.push(this.pendingContact);
      this.saveContactsState();
    } else {
      this.showConfirmPrompt(true);
    }
  }

  /********************************************************
  **************** Prompt Confirm Contact ******************
  *********************************************************/
  showConfirmPrompt(isPublished: boolean) {
    Logger.log('contacts', "Prompting contact confirm", this.pendingContact);
    const props: NavigationExtras = {
      queryParams: {
        id: this.pendingContact.id,
        name: this.pendingContact.credentials.name,
        image: this.pendingContact.credentials.avatar ? JSON.stringify(this.pendingContact.credentials.avatar) : null, // Temporary BPI fix to avoid receiving [Object object] in the confirm screen, but better avoid using query params for potentially large data like avatars. Need to fix here @chad.
        isPublished: isPublished,
      }
    }
    this.globalNav.navigateTo('contacts', '/contacts/confirm', props);
  }

  /********************************************************
  ******** Finalize Add Contact If Confirmed By User *******
  *********************************************************/
  addContact(): Promise<Boolean> {
    return new Promise(async (resolve, reject) => {
      const promptName = this.getPromptName(this.pendingContact);
      const targetContact: Contact = this.contacts.find(contact => contact.id === this.pendingContact.id);

      if(targetContact) {
        if(this.pendingContact.carrierAddress) {
          this.contacts[this.contacts.indexOf(targetContact)].carrierAddress = this.pendingContact.carrierAddress;

          // Modify contact in backup
          this.events.publish("backup:contact", this.contacts[this.contacts.indexOf(targetContact)]);

          this.native.genericToast(promptName + this.translate.instant('did-carrier-added'));
          Logger.log('contacts', 'Contact is already added but carrier address is updated');
        } else {
          this.native.genericToast(promptName + this.translate.instant('is-already-added'));
          Logger.log('contacts', 'Contact is already added');
        }
        resolve(true);
      } else {
        // If a carrier address was provided with a addfriend intent, we use this friend's carrier address
        // To try to reach him also through contact notifier plugin's global carrier address.
        // After he accepts this invitation, it becomes possible to send him remote notifications.
        if(this.pendingContact.notificationsCarrierAddress) {
          Logger.log('contacts', "Sending friend invitation through contact notifier");
          this.contactNotifier.sendInvitation(
            this.pendingContact.id,
            this.pendingContact.notificationsCarrierAddress
          );
        } else {
          Logger.log('contacts', "Added friend has no associated contact notifier carrier address");
        }

        if(this.contactNotifierInviationId) {
          Logger.log('contacts', 'Accepting contact notifier invitation', this.contactNotifierInviationId);
          this.contactNotifier.acceptInvitation(this.contactNotifierInviationId);
          this.contactNotifierInviationId = null;
        } else {
          Logger.log('contacts', 'Confirmed contact did not come from a "viewfriendinvitation" intent');
        }

        this.contacts.push(this.pendingContact);
        this.updateNotifierContact(this.pendingContact);

        // Add contact in backup
        this.events.publish("backup:contact", this.pendingContact);

        this.native.genericToast(promptName + this.translate.instant('was-added'));
        resolve(false);
      }

      this.saveContactsState();
    });
  }

  /********************************************************
  ******** Add/Update Contacts in Notifier Contacts ********
  *********************************************************/
  updateNotifierContact(contact: Contact) {
    this.contactNotifier.resolveContact(contact.id).then(
      (notifierContact: ContactNotifierContact) => {
        if(notifierContact) {
          let targetAvatar: Avatar = null;
          let targetName: string = null;

          if(contact.avatarLocal) {
            targetAvatar = contact.avatarLocal;
          } else if(contact.credentials.avatar) {
            targetAvatar = contact.credentials.avatar;
          }
          if(contact.customName) {
            targetName = contact.customName;
          } else if(contact.credentials.name) {
            targetName = contact.credentials.name;
          }

          if(targetAvatar) {
            Logger.log('contacts', 'Updating notifier contact avatar' + contact.id);
            notifierContact.setAvatar({
              contentType: targetAvatar.contentType,
              base64ImageData: targetAvatar.data
            });
          }
          if(targetName) {
            Logger.log('contacts', 'Updating notifier contact name' + contact.id);
            notifierContact.setName(targetName);
          }
        }
    });
  }

  /********************************************************
  *************** Finalize Delete Contact *****************
  *********************************************************/
  deleteContact(contact: Contact) {
    const promptName = this.getPromptName(contact);

    Logger.log('contacts', "Deleting contact from the contact notifier database");
    this.contactNotifier.removeContact(contact.id);

    Logger.log('contacts', 'Deleting contact', contact);
    this.contacts = this.contacts.filter(_contact => _contact.id !== contact.id);

    Logger.log('contacts', 'Updated contacts after deleting:' + contact.credentials.name, this.contacts);
    this.saveContactsState();

    // Update home page contact slides
    this.events.publish('friends:updateSlider');

    // Delete contact in backup
    this.events.publish("backup:deleteContact", contact);

    this.native.genericToast(promptName + this.translate.instant('was-deleted'));
    this.globalNav.navigateRoot('contacts', '/contacts/friends');
  }

  /**
  * If contact was deleted from slides, change active slide to next index of array
  * If contact of next index doesn't exist, change active slide to previous index
  **/
  updateContactsSlide(contact: Contact) {
    const replacedSlide = this.contacts[this.contacts.indexOf(contact) + 1];
    if(replacedSlide) {
      this.activeSlide = replacedSlide
    } else {
      this.activeSlide = this.contacts[this.contacts.indexOf(contact) - 1];
    }
    Logger.log('contacts', 'Active slide after deletion', this.activeSlide);
  }

  /********************************************************
  ************** Finalize Customize Contact ***************
  *********************************************************/
  customizeContact(id: string, customName: string, customNote: string, customAvatar: Avatar) {
    this.contacts.map(contact => {
      if(contact.id === id) {
        Logger.log("Contacts", 'Updating contact\'s custom values' + customName + customNote + customAvatar);

        contact.customName = customName;
        contact.customNote = customNote;
        contact.avatarLocal = customAvatar;

        this.saveContactsState();
        this.events.publish("backup:contact", contact);
      }
    });

    this.globalNav.navigateTo('friends', '/contacts/friends/'+id);
  }

  /********************************************************
  ************* Handle 'viewfriend' Intent ****************
  *********************************************************/
  async viewContact(didString: string) {
    this.getStoredContacts().then(async (contacts: Contact[]) => {
      const targetContact = contacts.find((contact) => contact.id === didString);
      if(targetContact) {
        this.globalNav.navigateTo('contacts', '/contacts/friends/'+didString);
      } else {
        this.native.showLoading('please-wait');
        await this.resolveDIDDocument(didString, false);
        this.native.hideLoading();
      }
    });
  }

  /********************************************************
  ************* Handle 'pickfriend'Intent *****************
  *********************************************************/

  // 'pickfriend' intent without filter param
  getContacts(isSingleInvite: boolean, intent: string) {
    this.getStoredContacts().then((contacts: Contact[]) => {
      Logger.log('contacts', 'Fetched stored contacts for pickfriend intent', contacts);
      const realContacts = contacts.filter((contact) => contact.id !== 'did:elastos');
      if (realContacts.length > 0) {
        let props: NavigationExtras = {
          queryParams: {
            singleInvite: isSingleInvite,
            intent: intent
          }
        }
        this.globalNav.navigateTo('contacts', '/contacts/invite', props);
      } else {
        this.globalNav.navigateRoot('contacts', '/contacts/friends');
        this.native.alertNoContacts(
          intent,
          this.managerService.handledIntentId,
          this.translate.instant('no-contacts-alert')
        );
      }
    });
  }

  // 'pickfriend' intent with filter param
  getFilteredContacts(isSingleInvite: boolean, ret) {
    this.getStoredContacts().then((contacts: Contact[]) => {
      Logger.log('contacts', 'Fetched stored contacts for pickfriend intent', contacts);
      const realContacts = contacts.filter((contact) => contact.id !== 'did:elastos');
      if(realContacts.length > 0) {
        this.filteredContacts = [];

        if(ret.params.filter.credentialType === 'ApplicationProfileCredential') {
          Logger.log('contacts', 'pickfriend intent requesting contact with app', ret.from);
          realContacts.map((contact) => {
            contact.credentials.applicationProfileCredentials.map((appCreds) => {
              if(appCreds.apppackage === ret.from) {
                this.filteredContacts.push(contact);
              }
            });
          });
        } else {
          Logger.log('contacts', 'Intent requesting friends with credential', ret.params.filter.credentialType);
          realContacts.map((contact) => {
            if(contact.credentials[ret.params.filter.credentialType]) {
              this.filteredContacts.push(contact);
            }
          });
        }

        if(this.filteredContacts.length > 0) {
          let props: NavigationExtras = {
            queryParams: {
              singleInvite: isSingleInvite,
              friendsFiltered: true,
              intent: 'pickfriend'
            }
          }
          this.globalNav.navigateTo('contacts', '/contacts/invite', props);
        } else {
          this.globalNav.navigateRoot('friends', '/contacts/friends');
          this.native.alertNoContacts(
            'pickfriend',
            this.managerService.handledIntentId,
            this.translate.instant('no-contacts-with-cred-alert')
          );
        }
      } else {
        this.globalNav.navigateRoot('contacts', '/contacts/friends');
        this.native.alertNoContacts(
          'pickfriend',
          this.managerService.handledIntentId,
          this.translate.instant('no-contacts-alert')
        );
        return;
      }
    });
  }

  async sendRemoteNotificationToContact(contactId: string, title: string, url: string) {
    let contactNotifierContact = await this.contactNotifier.resolveContact(contactId);
    if (contactNotifierContact) {
      Logger.log('contacts', "Sending shared content to friend with DID "+ contactId);
      await contactNotifierContact.sendRemoteNotification({
        title: "Shared content from a contact",
        message: title,
        url: url
      });
    }
    else {
      Logger.warn('contacts', "Not sending shared content to friend with DID " + contactId + " because he is not in the contact notifier");
    }
  }

  async shareToContacts(isFilter: boolean) {
    Logger.log('contacts', "Sharing to contacts");

    let sentNotificationsCount = 0;
    if (!isFilter) {
      await Promise.all(this.contacts.map(async (contact) => {
        if (contact.isPicked) {
          await this.sendRemoteNotificationToContact(contact.id, this.shareIntentData.title, this.shareIntentData.url);
          contact.isPicked = false;
          sentNotificationsCount++;
        }
      }));
    } else {
      await Promise.all(this.filteredContacts.map(async (contact) => {
        if(contact.isPicked) {
          await this.sendRemoteNotificationToContact(contact.id, this.shareIntentData.title, this.shareIntentData.url);
          contact.isPicked = false;
          sentNotificationsCount++;
        }
      }));
    }
    Logger.log('contacts', "Tried to send " + sentNotificationsCount + " notifications to friends");
    Logger.log('contacts', "Sending share intent response");
    this.globalIntentService.sendIntentResponse({},
      this.managerService.handledIntentId
    );
  }

  inviteContacts(isFilter: boolean, intent: string) {
    Logger.log('contacts', 'Invited filtered friends?', isFilter);
    let contactsForIntent = [];

    if (!isFilter) {
      contactsForIntent = this.contacts.filter((contact) => contact.isPicked);
      this.contacts.forEach((contact) => contact.isPicked = false);
    } else {
      contactsForIntent = this.filteredContacts.filter((contact) => contact.isPicked);
      this.filteredContacts.forEach((contact) => contact.isPicked = false);
    }

    Logger.log('contacts', 'Invited Contacts', contactsForIntent);
    this.sendIntentRes(contactsForIntent, intent);
  }

  sendIntentRes(contacts: Contact[], intent: string) {
    if(contacts.length > 0) {
      this.globalIntentService.sendIntentResponse(
        { friends: contacts },
        this.managerService.handledIntentId
      );
    } else {
      this.native.genericToast(this.translate.instant('select-before-invite'));
    }
  }

  /********************************************************
  ************* Manage Favorite Contacts ******************
  *********************************************************/
  toggleFav(contact: Contact) {
    contact.isFav = !contact.isFav;
    this.storageService.setContacts(this.contacts);
  }

  /********************************************************
  ********************* Share Contact *********************
  *********************************************************/
  shareContact(contact: Contact) {
    let link = 'https://contact.elastos.net/addfriend?did=' + contact.id;
    this.clipboard.copy(link);
    this.native.shareToast();
  }

  /********************************************************
  ************** Handle Contact Buttons *******************
  *********************************************************/
  showCustomization(contact: Contact, contactAddedWithNoName: boolean) {
    const props: NavigationExtras = {
      queryParams: {
        id: contact.id,
        name: contact.credentials.name,
        avatar: JSON.stringify(contact.avatarLocal),
        customName: contact.customName,
        customNote: contact.customNote,
        contactAddedWithNoName: contactAddedWithNoName,
      }
    }
    this.globalNav.navigateTo('contacts', '/contacts/customize', props);
  }

  /********************************************************
  ************* Sort Contacts Alphabetically **************
  *********************************************************/
  sortContacts() {
    this.letters = [];
    this.contacts.map((contact) => {
      // Add letter: 'anonymous'
      if(
        !contact.credentials.name && contact.customName && contact.customName === 'Anonymous Contact' && !this.letters.includes('Anonymous') ||
        !contact.credentials.name && !contact.customName && !this.letters.includes('Anonymous')
      ) {
        this.letters.push('Anonymous');
      };
      // Add first letter: contact name credential
      if(
        contact.credentials.name && !contact.customName && !this.letters.includes(contact.credentials.name[0].toUpperCase())
      ) {
        this.letters.push(contact.credentials.name[0].toUpperCase());
      }
      // Add first letter: contact custom name
      if(
        !contact.credentials.name && contact.customName && contact.customName !== 'Anonymous Contact' && !this.letters.includes(contact.customName[0].toUpperCase()) ||
        contact.credentials.name && contact.customName && contact.customName !== 'Anonymous Contact' && !this.letters.includes(contact.customName[0].toUpperCase())
      ) {
        this.letters.push(contact.customName[0].toUpperCase());
      }
    });

    this.letters = this.letters.sort((a, b) => a > b ? 1 : -1);
    this.letters.push(this.letters.splice(this.letters.indexOf('Anonymous'), 1)[0]);
  }

  getPromptName(contact: Contact): string {
    if(contact.customName) {
      return contact.customName
    } else if(contact.credentials.name) {
      return contact.credentials.name;
    } else {
      return this.translate.instant('anonymous-contact');
    }
  }

  saveContactsState() {
    this.storageService.setContacts(this.contacts);
    this.sortContacts();
  }
}

