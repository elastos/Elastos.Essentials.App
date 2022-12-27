import { Injectable, NgZone } from '@angular/core';
import { NavigationExtras } from '@angular/router';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { Logger } from 'src/app/logger';
import { App } from "src/app/model/app.enum";
import { Contact as ContactNotifierContact, ContactNotifierService } from 'src/app/services/contactnotifier.service';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { defaultContacts } from '../config/config';
import { Avatar } from '../models/avatar';
import { Contact } from '../models/contact.model';
import { DidService } from './did.service';
import { NativeService } from './native.service';

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
  public contacts = new BehaviorSubject<Contact[]>(null); // null = not loaded

  // For friends page avatar slider
  public activeSlide: Contact;

  // Set first contact for first visit
  public firstVisit = false;

  // Check contacts on app load for updates
  public contactsRemoteUpdated = false;

  // Temporary storage for an invitation id from a received "viewfriendinviation" intent
  public contactNotifierInviationId: string = null;

  constructor(
    private globalNav: GlobalNavService,
    public zone: NgZone,
    private clipboard: Clipboard,
    public translate: TranslateService,
    private native: NativeService,
    private storage: GlobalStorageService,
    private events: GlobalEvents,
    private didService: DidService,
    private contactNotifier: ContactNotifierService,
    private globalIntentService: GlobalIntentService,
  ) { }

  public stop() {
    this.pendingContact = null;
    this.contacts.next([]);
    this.contactsRemoteUpdated = false;
    return;
  }

  async init() {
    await this.loadStoredContacts();
    void this.checkFirstVisitOperations(); // Non blocking add of default contacts in background
    this.getContactNotifierContacts();
  }

  public getContacts(): Contact[] {
    return this.contacts.value;
  }

  public getContact(id: string): Contact {
    return { ...this.contacts.value.find(contact => contact.id === id) };
  }

  /******************************************************
  * Check if it's the first time user enters contacts.
  * If so, add a few default fake contacts.
  *******************************************************/
  async checkFirstVisitOperations() {
    let visit = await this.storage.getSetting<boolean>(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "contacts", 'visited', false);
    if (!visit) {
      await this.addDefaultContacts();
      await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, 'contacts', 'visited', true)
    }
  }

  /**
   * Adds a few default contacts to the contacts list, so that user feels he is not alone.
   */
  private async addDefaultContacts(): Promise<void> {
    // Show a loader - this may take a while
    Logger.log("contacts", "Adding default contacts", defaultContacts);
    for (let contactDID of defaultContacts) {
      // Don't await to resolve each contact  one by one. This may work in parrallel and not
      // block the boot sequence.
      await this.resolveDIDDocument(contactDID, false, null, false);
    }
    Logger.log("contacts", "Default contacts were added");
    return;
  }

  /**
   * Load contacts from disk
   */
  private async loadStoredContacts(): Promise<void> {
    // FOR DEBUG
    //await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "contacts", "contacts", []);

    Logger.log("contacts", "Getting stored contacts for DID ", DIDSessionsStore.signedInDIDString);
    let contacts = await this.storage.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "contacts", "contacts", []);
    Logger.log("Contacts", 'Stored contacts loaded from disk', contacts);

    this.contacts.next(contacts);
  }

  /**
   * Store contacts to disk
   */
  public async storeContacts() {
    await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "contacts", "contacts", this.contacts.value);
  }

  /**
   * Starts the process of retrieveing DID documents of each contact to get the most recent data
   * (name, avatar, etc)
   */
  public async remoteUpdateContactsOnlyOnce(): Promise<void> {
    if (this.contactsRemoteUpdated)
      return;

    this.contactsRemoteUpdated = true;
    for (let contact of this.contacts.value) {
      Logger.log("Contacts", 'Checking stored contact for updates', contact);
      contact.id !== 'did:elastos' ? await this.resolveDIDDocument(contact.id, true) : null;
    }
  }

  /************************************************
  *** Add Unadded Contacts from Contact Notifier ***
  *************************************************/
  getContactNotifierContacts() {
    void this.contactNotifier.getAllContacts().then(async (notifierContacts) => {
      //Logger.log("Contacts", 'Found all Notifier Contacts', notifierContacts);
      for (let notifierContact of notifierContacts) {
        const alreadyAddedContact = this.contacts.value.find((contact) => contact.id === notifierContact.getDID());
        if (!alreadyAddedContact) {
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
              avatar: contactAvatar && Object.getOwnPropertyNames(contactAvatar).length !== 0 ? Avatar.fromContactNotifierContactAvatar(contactAvatar) : null
            },
            avatarLocal: null,
            customName: null,
            customNote: null,
            isPicked: false,
            isFav: false,
            carrierAddress: notifierContact.getCarrierUserID(),
            notificationsCarrierAddress: null
          }

          await this.safeAddContact(newContact);
        } else {
          Logger.log('contacts', 'Contact Notifier Contact', alreadyAddedContact + ' is already added');
        }
      }

      await this.storeContacts();
    });
  }

  /************************************************
  *********** Add Friend By Scan Button ***********
  *************************************************/
  async scanDID() {
    let res = await this.globalIntentService.sendIntent("https://scanner.web3essentials.io/scanqrcode");
    Logger.log('contacts', "Got scan result", res);

    // Scanned content could contain different things:
    // - A did: did:elastos:xxxx
    // - A add friend url: https://contact.web3essentials.io/addfriend?did=xxx[&carrier=xxx]
    // - Something that we don't know
    let scannedContentHandled = false
    if (res && res.result && res.result.scannedContent) {
      let scannedContent = res.result.scannedContent;

      if (scannedContent.indexOf("did:") == 0) {
        // We've scanned a DID string. Add friend, without carrier address support
        Logger.log('contacts', "Scanned content is a DID string");
        void this.addContactByIntent(scannedContent, null);
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
            if (carrierAddress === 'null') {
                carrierAddress = null;
            }
            void this.addContactByIntent(did, carrierAddress);
            scannedContentHandled = true;
          }
        }
      }
    }

    if (!scannedContentHandled) {
      void this.native.genericToast(this.translate.instant('contacts.failed-read-scan'));
    }
  }

  /*******************************************
  *********** Add Contact By Intent ***********
  ********************************************/
  async addContactByIntent(did: string, carrierAddress?: string) {
    Logger.log('contacts', 'Received contact by intent', did, carrierAddress);

    if (this.didService.getUserDID() === did) {
      void this.native.genericToast('contacts.please-dont-add-self');
      void this.globalNav.navigateRoot('contacts', '/contacts/friends');
    } else {
      const targetContact: Contact = this.contacts.value.find(contact => contact.id === did);
      if (targetContact) {
        const promptName = this.getPromptName(targetContact);

        if (carrierAddress) {
          this.contacts[this.contacts.value.indexOf(targetContact)].notificationsCarrierAddress = carrierAddress;
          await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "contacts", "contacts", this.contacts.value);
          void this.globalNav.navigateRoot('contacts', '/contacts/friends/' + targetContact.id);
          void this.native.genericToast(promptName + this.translate.instant('contacts.did-carrier-added'));
          Logger.log('contacts', 'Contact is already added but carrier address is updated', this.contacts[this.contacts.value.indexOf(targetContact)]);
        } else {
          void this.native.genericToast(promptName + this.translate.instant('contacts.is-already-added'));
          void this.globalNav.navigateRoot('contacts', '/contacts/friends/' + targetContact.id);
          Logger.log('contacts', 'Contact is already added');
        }
      } else {
        void this.native.showLoading(this.translate.instant('common.please-wait'));
        await this.resolveDIDDocument(did, false, carrierAddress);
        void this.native.hideLoading();
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
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      didManager.resolveDidDocument(didString, true, async (didDocument: DIDPlugin.DIDDocument) => {
        Logger.log("Contacts", "DIDDocument resolved for DID " + didString, didDocument);
        if (didDocument && !updatingFriends) {
          await this.buildPublishedContact(didDocument, carrierAddress, requiresConfirmation);
        } else if (didDocument && updatingFriends) {
          await this.updateContact(didDocument);
        } else if (!didDocument && updatingFriends) {
          return;
        } else {
          void this.native.genericToast(this.translate.instant('contacts.contact-is-unpublished'));
          await this.buildUnpublishedContact(didString, carrierAddress, requiresConfirmation);
        }

        resolve();
      }, (err: any) => {
        Logger.error('contacts', "DIDDocument resolving error", err);
        resolve();
      });
    });
  }

  /************************************************
  ***** Update Contact's Credentials on App Load  *
  *************************************************/
  async updateContact(newDoc): Promise<void> {
    for (let contact of this.contacts.value) {
      if (contact.id === newDoc.id.didString) {
        Logger.log("Contacts", 'Updating contact', contact);

        contact.didDocument = newDoc;
        for (let key of newDoc.verifiableCredential) {
          if ('name' in key.credentialSubject) {
            contact.credentials.name = key.credentialSubject.name;
          }
          if ('gender' in key.credentialSubject) {
            contact.credentials.gender = key.credentialSubject.gender;
          }
          if ('avatar' in key.credentialSubject) {
            contact.credentials.avatar = await Avatar.fromAvatarCredential(key.credentialSubject.avatar);
          }
          if ('nickname' in key.credentialSubject) {
            contact.credentials.nickname = key.credentialSubject.nickname;
          }
          if ('nationality' in key.credentialSubject) {
            contact.credentials.nation = key.credentialSubject.nation;
          }
          if ('birthDate' in key.credentialSubject) {
            contact.credentials.birthDate = key.credentialSubject.birthDate;
          }
          if ('birthPlace' in key.credentialSubject) {
            contact.credentials.birthPlace = key.credentialSubject.birthPlace;
          }
          if ('occupation' in key.credentialSubject) {
            contact.credentials.occupation = key.credentialSubject.occupation;
          }
          if ('education' in key.credentialSubject) {
            contact.credentials.education = key.credentialSubject.education;
          }
          if ('telephone' in key.credentialSubject) {
            contact.credentials.telephone = key.credentialSubject.telephone;
          }
          if ('email' in key.credentialSubject) {
            contact.credentials.email = key.credentialSubject.email;
          }
          if ('interests' in key.credentialSubject) {
            contact.credentials.interests = key.credentialSubject.interests;
          }
          if ('description' in key.credentialSubject) {
            contact.credentials.description = key.credentialSubject.description;
          }
          if ('url' in key.credentialSubject) {
            contact.credentials.url = key.credentialSubject.url;
          }
          if ('twitter' in key.credentialSubject) {
            contact.credentials.twitter = key.credentialSubject.twitter;
          }
          if ('facebook' in key.credentialSubject) {
            contact.credentials.facebook = key.credentialSubject.facebook;
          }
          if ('instagram' in key.credentialSubject) {
            contact.credentials.instagram = key.credentialSubject.instagram;
          }
          if ('snapchat' in key.credentialSubject) {
            contact.credentials.snapchat = key.credentialSubject.snapchat;
          }
          if ('telegram' in key.credentialSubject) {
            contact.credentials.telegram = key.credentialSubject.telegram;
          }
          if ('wechat' in key.credentialSubject) {
            contact.credentials.wechat = key.credentialSubject.wechat;
          }
          if ('weibo' in key.credentialSubject) {
            contact.credentials.weibo = key.credentialSubject.weibo;
          }
          if ('twitch' in key.credentialSubject) {
            contact.credentials.twitch = key.credentialSubject.twitch;
          }
          if ('elaAddress' in key.credentialSubject) {
            contact.credentials.elaAddress = key.credentialSubject.elaAddress;
          }
        }

        await this.storeContacts();
        this.updateNotifierContact(contact);
      }
    }
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
        avatar: null
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
  async buildUnpublishedContact(didString: string, carrierString?: string, requiresConfirmation?: boolean): Promise<void> {
    Logger.log('contacts', 'Building contact using unresolved DID for confirm-prompt', didString);
    this.resetPendingContact(didString, carrierString);

    if (requiresConfirmation === false) {
      await this.safeAddContact(this.pendingContact);
    } else {
      this.showConfirmPrompt(false);
    }
  }

  /*******************************************************
  **** Start Filling Current Contact for Resolved DID *****
  *********************************************************/
  async buildPublishedContact(resolvedDidDocument, carrierString?: string, requiresConfirmation?: boolean): Promise<void> {
    Logger.log('contacts', 'Building contact using resolved DID document for confirm-prompt', resolvedDidDocument);
    const resolvedDidString = resolvedDidDocument.id.didString;
    this.resetPendingContact(resolvedDidString, carrierString);

    this.pendingContact.didDocument = resolvedDidDocument;
    this.pendingContact.id = resolvedDidString;

    for (let key of resolvedDidDocument.verifiableCredential) {
      if ('name' in key.credentialSubject) {
        //Logger.log('contacts', 'Resolved DID has name');
        this.pendingContact.credentials.name = key.credentialSubject.name;
      }
      if ('avatar' in key.credentialSubject) {
        //Logger.log('contacts', 'Resolved DID has avatar');
        this.pendingContact.credentials.avatar = await Avatar.fromAvatarCredential(key.credentialSubject.avatar);
      }
      if ('nickname' in key.credentialSubject) {
        //Logger.log('contacts', 'Resolved DID has nickname');
        this.pendingContact.credentials.nickname = key.credentialSubject.nickname;
      }
      if ('gender' in key.credentialSubject) {
        //Logger.log('contacts', 'Resolved DID has gender');
        this.pendingContact.credentials.gender = key.credentialSubject.gender;
      }
      if ('nationality' in key.credentialSubject) {
        //Logger.log('contacts', 'Resolved DID has nation');
        this.pendingContact.credentials.nation = key.credentialSubject.nation;
      }
      if ('birthDate' in key.credentialSubject) {
        //Logger.log('contacts', 'Resolved DID has birth date');
        this.pendingContact.credentials.birthDate = key.credentialSubject.birthDate;
      }
      if ('birthPlace' in key.credentialSubject) {
        //Logger.log('contacts', 'Resolved DID has birth place');
        this.pendingContact.credentials.birthPlace = key.credentialSubject.birthPlace;
      }
      if ('occupation' in key.credentialSubject) {
        //Logger.log('contacts', 'Resolved DID has occupation');
        this.pendingContact.credentials.occupation = key.credentialSubject.occupation;
      }
      if ('education' in key.credentialSubject) {
        //Logger.log('contacts', 'Resolved DID has education');
        this.pendingContact.credentials.education = key.credentialSubject.education;
      }
      if ('telephone' in key.credentialSubject) {
        //Logger.log('contacts', 'Resolved DID has telephone');
        this.pendingContact.credentials.telephone = key.credentialSubject.telephone;
      }
      if ('email' in key.credentialSubject) {
        //Logger.log('contacts', 'Resolved DID has email');
        this.pendingContact.credentials.email = key.credentialSubject.email;
      }
      if ('interests' in key.credentialSubject) {
        //Logger.log('contacts', 'Resolved DID has interests');
        this.pendingContact.credentials.interests = key.credentialSubject.interests;
      }
      if ('description' in key.credentialSubject) {
        //Logger.log('contacts', 'Resolved DID has description');
        this.pendingContact.credentials.description = key.credentialSubject.description;
      }
      if ('url' in key.credentialSubject) {
        //Logger.log('contacts', 'Resolved DID has website');
        this.pendingContact.credentials.url = key.credentialSubject.url;
      }
      if ('twitter' in key.credentialSubject) {
        //Logger.log('contacts', 'Resolved DID has twitter');
        this.pendingContact.credentials.twitter = key.credentialSubject.twitter;
      }
      if ('facebook' in key.credentialSubject) {
        //Logger.log('contacts', 'Resolved DID has facebook');
        this.pendingContact.credentials.facebook = key.credentialSubject.facebook;
      }
      if ('instagram' in key.credentialSubject) {
        //Logger.log('contacts', 'Resolved DID has instagram');
        this.pendingContact.credentials.instagram = key.credentialSubject.instagram;
      }
      if ('snapchat' in key.credentialSubject) {
        //Logger.log('contacts', 'Resolved DID has snapchat');
        this.pendingContact.credentials.snapchat = key.credentialSubject.snapchat;
      }
      if ('telegram' in key.credentialSubject) {
        //Logger.log('contacts', 'Resolved DID has telegram');
        this.pendingContact.credentials.telegram = key.credentialSubject.telegram;
      }
      if ('wechat' in key.credentialSubject) {
        //Logger.log('contacts', 'Resolved DID has wechat');
        this.pendingContact.credentials.wechat = key.credentialSubject.wechat;
      }
      if ('weibo' in key.credentialSubject) {
        //Logger.log('contacts', 'Contact has weibo');
        this.pendingContact.credentials.weibo = key.credentialSubject.weibo;
      }
      if ('twitch' in key.credentialSubject) {
        //Logger.log('contacts', 'Contact has twitch');
        this.pendingContact.credentials.twitch = key.credentialSubject.twitch;
      }
      if ('elaAddress' in key.credentialSubject) {
        //Logger.log('contacts', 'Contact has ela wallet');
        this.pendingContact.credentials.elaAddress = key.credentialSubject.elaAddress;
      }
    }

    if (requiresConfirmation === false) {
      await this.safeAddContact(this.pendingContact);
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
    void this.globalNav.navigateRoot('contacts', '/contacts/confirm', props);
  }

  /********************************************************
  ******** Finalize Add Contact If Confirmed By User *******
  *********************************************************/
  addContact(): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      const promptName = this.getPromptName(this.pendingContact);
      const targetContact: Contact = this.contacts.value.find(contact => contact.id === this.pendingContact.id);

      if (targetContact) {
        if (this.pendingContact.carrierAddress) {
          this.contacts[this.contacts.value.indexOf(targetContact)].carrierAddress = this.pendingContact.carrierAddress;

          // Modify contact in backup
          this.events.publish("backup:contact", this.contacts[this.contacts.value.indexOf(targetContact)]);

          void this.native.genericToast(promptName + this.translate.instant('contacts.did-carrier-added'));
          Logger.log('contacts', 'Contact is already added but carrier address is updated');
        } else {
          void this.native.genericToast(promptName + this.translate.instant('contacts.is-already-added'));
          Logger.log('contacts', 'Contact is already added');
        }
        resolve(true);
      } else {
        // If a carrier address was provided with a addfriend intent, we use this friend's carrier address
        // To try to reach him also through contact notifier plugin's global carrier address.
        // After he accepts this invitation, it becomes possible to send him remote notifications.
        if (this.pendingContact.notificationsCarrierAddress) {
          Logger.log('contacts', "Sending friend invitation through contact notifier");
          void this.contactNotifier.sendInvitation(
            this.pendingContact.id,
            this.pendingContact.notificationsCarrierAddress
          );
        } else {
          Logger.log('contacts', "Added friend has no associated contact notifier carrier address");
        }

        if (this.contactNotifierInviationId) {
          Logger.log('contacts', 'Accepting contact notifier invitation', this.contactNotifierInviationId);
          void this.contactNotifier.acceptInvitation(this.contactNotifierInviationId);
          this.contactNotifierInviationId = null;
        } else {
          Logger.log('contacts', 'Confirmed contact did not come from a "viewfriendinvitation" intent');
        }

        await this.safeAddContact(this.pendingContact);
        this.updateNotifierContact(this.pendingContact);

        // Add contact in backup
        this.events.publish("backup:contact", this.pendingContact);

        void this.native.genericToast(promptName + this.translate.instant('contacts.was-added'));
        resolve(false);
      }

      await this.storeContacts();
    });
  }

  /**
   * Adds a contact to the global contacts array, but first makes sure that the contact (by DID)
   * doesn't already exit yet to be robust against any logic mistake.
   */
  public async safeAddContact(contact: Contact) {
    if (this.contacts.value.find(c => c.id === contact.id)) {
      Logger.warn("contacts", "Trying to add contact that already exists in the list! Logic error", contact, this.contacts);
      return;
    }

    let contacts = this.contacts.value;
    contacts.push(contact);
    this.contacts.next(contacts);

    await this.storeContacts();
  }

  /********************************************************
  ******** Add/Update Contacts in Notifier Contacts ********
  *********************************************************/
  updateNotifierContact(contact: Contact) {
    void this.contactNotifier.resolveContact(contact.id).then(
      (notifierContact: ContactNotifierContact) => {
        if (notifierContact) {
          let targetAvatar: Avatar = null;
          let targetName: string = null;

          if (contact.avatarLocal) {
            targetAvatar = contact.avatarLocal;
          } else if (contact.credentials.avatar) {
            targetAvatar = contact.credentials.avatar;
          }
          if (contact.customName) {
            targetName = contact.customName;
          } else if (contact.credentials.name) {
            targetName = contact.credentials.name;
          }

          if (targetAvatar) {
            Logger.log('contacts', 'Updating notifier contact avatar' + contact.id);
            void notifierContact.setAvatar({
              contentType: targetAvatar.contentType,
              base64ImageData: targetAvatar.data
            });
          }
          if (targetName) {
            Logger.log('contacts', 'Updating notifier contact name' + contact.id);
            void notifierContact.setName(targetName);
          }
        }
      });
  }

  /********************************************************
  *************** Finalize Delete Contact *****************
  *********************************************************/
  async deleteContact(contact: Contact, notifyAndNav = true) {
    const promptName = this.getPromptName(contact);

    Logger.log('contacts', "Deleting contact from the contact notifier database");
    await this.contactNotifier.removeContact(contact.id);

    Logger.log('contacts', 'Deleting contact', contact);
    let contacts = this.contacts.value.filter(_contact => _contact.id !== contact.id);
    this.contacts.next(contacts);

    Logger.log('contacts', 'Updated contacts after deleting:' + contact.credentials.name, this.contacts);
    await this.storeContacts();

    // Update home page contact slides
    this.events.publish('friends:updateSlider');

    // Delete contact in backup
    this.events.publish("backup:deleteContact", contact);

    if (notifyAndNav) {
      void this.native.genericToast(promptName + this.translate.instant('contacts.was-deleted'));
      void this.globalNav.navigateRoot('contacts', '/contacts/friends');
    }
  }

  /**
  * If contact was deleted from slides, change active slide to next index of array
  * If contact of next index doesn't exist, change active slide to previous index
  **/
  updateContactsSlide(contact: Contact) {
    const replacedSlide = this.contacts[this.contacts.value.indexOf(contact) + 1];
    if (replacedSlide) {
      this.activeSlide = replacedSlide
    } else {
      this.activeSlide = this.contacts[this.contacts.value.indexOf(contact) - 1];
    }
    Logger.log('contacts', 'Active slide after deletion', this.activeSlide);
  }

  /********************************************************
  ************** Finalize Customize Contact ***************
  *********************************************************/
  async customizeContact(id: string, customName: string, customNote: string, customAvatar: Avatar) {
    for (let contact of this.contacts.value) {
      if (contact.id === id) {
        Logger.log("Contacts", 'Updating contact\'s custom values' + customName + customNote + customAvatar);

        contact.customName = customName;
        contact.customNote = customNote;
        contact.avatarLocal = customAvatar;

        await this.storeContacts();
        this.events.publish("backup:contact", contact);
      }
    }

    void this.globalNav.navigateRoot(App.CONTACTS, '/contacts/friends/' + id);
  }

  /********************************************************
  ************* Manage Favorite Contacts ******************
  *********************************************************/
  async toggleFav(contact: Contact) {
    contact.isFav = !contact.isFav;
    await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "contacts", "contacts", this.contacts.value);
  }

  /********************************************************
  ********************* Share Contact *********************
  *********************************************************/
  async shareContact(contact: Contact) {
    let link = 'https://contact.web3essentials.io/addfriend?did=' + contact.id;
    await this.clipboard.copy(link);
    void this.native.shareToast();
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
    void this.globalNav.navigateRoot(App.CONTACTS, '/contacts/customize', props);
  }

  /**
   * From a list of contacts, returns the ordered list of firstname first letters in use.
   * eg from Ben, Zhiming, Lemon, this returns [B, L, Z]
   **/
  public extractContactFirstLetters(contacts: Contact[]): string[] {
    let letters: string[] = [];
    contacts.map((contact) => {
      // Add letter: 'anonymous'
      if (
        !contact.credentials.name && contact.customName && contact.customName === 'Anonymous Contact' && !letters.includes('Anonymous') ||
        !contact.credentials.name && !contact.customName && !letters.includes('Anonymous')
      ) {
        letters.push('Anonymous');
      }
      // Add first letter: contact name credential
      if (
        contact.credentials.name && !contact.customName && !letters.includes(contact.credentials.name[0].toUpperCase())
      ) {
        letters.push(contact.credentials.name[0].toUpperCase());
      }
      // Add first letter: contact custom name
      if (
        !contact.credentials.name && contact.customName && contact.customName !== 'Anonymous Contact' && !letters.includes(contact.customName[0].toUpperCase()) ||
        contact.credentials.name && contact.customName && contact.customName !== 'Anonymous Contact' && !letters.includes(contact.customName[0].toUpperCase())
      ) {
        letters.push(contact.customName[0].toUpperCase());
      }
    });

    letters = letters.sort((a, b) => a > b ? 1 : -1);
    letters.push(letters.splice(letters.indexOf('Anonymous'), 1)[0]);

    return letters;
  }

  getPromptName(contact: Contact): string {
    if (contact.customName) {
      return contact.customName
    } else if (contact.credentials.name) {
      return contact.credentials.name;
    } else {
      return this.translate.instant('contacts.anonymous-contact');
    }
  }
}

