/* eslint-disable no-prototype-builtins */
import { Injectable, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { ContactNotifierService } from 'src/app/services/contactnotifier.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { Contact } from '../models/contact.model';
import { InvitePageParams } from '../pages/invite/invite.page';
import { FriendsService } from './friends.service';
import { NativeService } from './native.service';

@Injectable({
  providedIn: 'root'
})
export class IntentService {
  private intentSubscription: Subscription = null;

  public handledIntentId: number;
  public shareIntentData: {
    title: string,
    url?: string
  } = null;

  constructor(
    private zone: NgZone,
    private friendsService: FriendsService,
    private intentService: GlobalIntentService,
    private globalIntentService: GlobalIntentService,
    private globalNav: GlobalNavService,
    private translate: TranslateService,
    private contactNotifier: ContactNotifierService,
    private native: NativeService
  ) {
  }

  init() {
    this.intentSubscription = this.intentService.intentListener.subscribe((receivedIntent) => {
      if (receivedIntent)
        this.onReceiveIntent(receivedIntent);
    })
  }

  stop() {
    if (this.intentSubscription) {
      this.intentSubscription.unsubscribe();
      this.intentSubscription = null;
    }
  }

  onReceiveIntent(intent: EssentialsIntentPlugin.ReceivedIntent) {
    this.handledIntentId = intent.intentId;

    switch (intent.action) {
      case "handlescannedcontent_did":
        Logger.log('contacts', 'handlescannedcontent_did intent', intent);
        this.zone.run(() => {
          void this.friendsService.addContactByIntent(intent.params.did, intent.params.carrier);
          this.sendEmptyIntentRes();
        });
        break;
      case "https://contact.web3essentials.io/addfriend":
        Logger.log('contacts', 'addfriend intent', intent);
        this.zone.run(() => {
          void this.friendsService.addContactByIntent(intent.params.did, intent.params.carrier);
          this.sendEmptyIntentRes();
        });
        break;
      case "https://contact.web3essentials.io/viewfriendinvitation":
        Logger.log('contacts', 'viewfriendinvitation intent', intent);
        this.zone.run(() => {
          this.friendsService.contactNotifierInviationId = intent.params.invitationid;
          void this.friendsService.addContactByIntent(intent.params.did);
          this.sendEmptyIntentRes();
        });
        break;
      case "share":
        Logger.log('contacts', 'share intent', intent);

        this.shareIntentData = {
          title: intent.params.title,
          url: intent.params.url
        };

        this.zone.run(() => {
          this.handleSelectContactAction(false, 'share');
          this.sendEmptyIntentRes();
        });
        break;
      case "https://contact.web3essentials.io/viewfriend":
        Logger.log('contacts', 'viewfriend intent', intent);
        this.zone.run(() => {
          void this.viewContact(intent.params.did);
          this.sendEmptyIntentRes();
        });
        break;
      case "https://contact.web3essentials.io/pickfriend":
        Logger.log('contacts', 'pickfriend intent', intent);
        this.zone.run(() => {
          let params = intent.params;
          // Single Invite, No Filter
          if (
            !params.hasOwnProperty('singleSelection') && !params.hasOwnProperty('filter') ||
            params.hasOwnProperty('singleSelection') && params.singleSelection === true && !params.hasOwnProperty('filter')) {
            Logger.log('contacts', 'pickfriend intent is single selection without filter');
            this.handleSelectContactAction(true, 'pickfriend');
          }
          // Multiple Invite, No Filter
          if (params.hasOwnProperty('singleSelection') && params.singleSelection === false && !params.hasOwnProperty('filter')) {
            Logger.log('contacts', 'pickfriend intent is multiple selection without filter');
            this.handleSelectContactAction(false, 'pickfriend');
          }
          // Single Invite, With Filter
          if (
            !params.hasOwnProperty('singleSelection') && params.hasOwnProperty('filter') ||
            params.hasOwnProperty('singleSelection') && params.singleSelection === true && params.hasOwnProperty('filter')) {
            Logger.log('contacts', 'pickfriend intent is single selection and filtered by credential');
            this.getFilteredContacts(true, intent);
          }
          // Multiple Invite, With Filter
          if (params.hasOwnProperty('singleSelection') && params.singleSelection === false && params.hasOwnProperty('filter')) {
            Logger.log('contacts', 'pickfriend intent is multiple selection and filtered by credential');
            this.getFilteredContacts(false, intent);
          }
        });

        break;
    }
  }

  // 'pickfriend' intent without filter param
  handleSelectContactAction(isSingleInvite: boolean, actionType: "share" | "pickfriend") {
    let contacts = this.friendsService.contacts.value;
    Logger.log('contacts', 'Fetched stored contacts for pickfriend intent', contacts);
    const realContacts = contacts.filter((contact) => contact.id !== 'did:elastos');
    if (realContacts.length > 0) {
      let state: InvitePageParams = {
        singleInvite: isSingleInvite,
        actionType: actionType
      };
      void this.globalNav.navigateTo('contacts', '/contacts/invite', { state });
    } else {
      void this.globalNav.navigateRoot('contacts', '/contacts/friends');
      void this.native.alertNoContactsAndSendIntentResponse(
        this.handledIntentId,
        this.translate.instant('contacts.no-contacts-alert')
      );
    }
  }

  // 'pickfriend' intent with filter param
  getFilteredContacts(isSingleInvite: boolean, intent: EssentialsIntentPlugin.ReceivedIntent) {
    let contacts = this.friendsService.contacts.value;
    Logger.log('contacts', 'Fetched stored contacts for pickfriend intent', contacts);
    const realContacts = contacts.filter((contact) => contact.id !== 'did:elastos');
    if (realContacts.length > 0) {
      // User has contacts
      let filteredContacts = [];

      Logger.log('contacts', 'Intent requesting friends with credential', intent.params.filter.credentialType);
      realContacts.map((contact) => {
        if (contact.credentials[intent.params.filter.credentialType]) {
          filteredContacts.push(contact);
        }
      });

      if (filteredContacts.length > 0) {
        let state: InvitePageParams = {
          singleInvite: isSingleInvite,
          contacts: filteredContacts,
          actionType: 'pickfriend'
        };
        void this.globalNav.navigateTo('contacts', '/contacts/invite', { state });
      } else {
        void this.globalNav.navigateRoot('friends', '/contacts/friends');
        void this.native.alertNoContactsAndSendIntentResponse(
          this.handledIntentId,
          this.translate.instant('contacts.no-contacts-with-cred-alert')
        );
      }
    } else {
      // User has no "real" (except the placeholder) contact yet
      void this.globalNav.navigateRoot('contacts', '/contacts/friends');
      void this.native.alertNoContactsAndSendIntentResponse(
        this.handledIntentId,
        this.translate.instant('contacts.no-contacts-alert')
      );
      return;
    }
  }

  async sendRemoteNotificationToContact(contactId: string, title: string, url: string) {
    let contactNotifierContact = await this.contactNotifier.resolveContact(contactId);
    if (contactNotifierContact) {
      Logger.log('contacts', "Sending shared content to friend with DID " + contactId);
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

  async shareToContacts(contacts: Contact[]) {
    Logger.log('contacts', "Sharing to contacts");

    let sentNotificationsCount = 0;

    await Promise.all(contacts.map(async (contact) => {
      if (contact.isPicked) {
        await this.sendRemoteNotificationToContact(contact.id, this.shareIntentData.title, this.shareIntentData.url);
        contact.isPicked = false;
        sentNotificationsCount++;
      }
    }));

    Logger.log('contacts', "Tried to send " + sentNotificationsCount + " notifications to friends");
    Logger.log('contacts', "Sending share intent response");
    void this.globalIntentService.sendIntentResponse({},
      this.handledIntentId
    );
  }

  inviteContacts(actionType: string, contacts: Contact[]) {
    Logger.log('contacts', 'Invited filtered friends?');

    contacts.forEach((contact) => contact.isPicked = false);

    Logger.log('contacts', 'Invited Contacts', contacts);
    this.sendIntentRes(contacts, actionType);
  }


  /********************************************************
  ************* Handle 'viewfriend' Intent ****************
  *********************************************************/
  async viewContact(didString: string) {
    let contacts = this.friendsService.contacts.value;
    const targetContact = contacts.find((contact) => contact.id === didString);
    if (targetContact) {
      void this.globalNav.navigateTo('contacts', '/contacts/friends/' + didString);
    } else {
      await this.friendsService.resolveDIDDocument(didString, false);
    }
  }

  sendIntentRes(contacts: Contact[], intent: string) {
    if (contacts.length > 0) {
      void this.globalIntentService.sendIntentResponse(
        { friends: contacts },
        this.handledIntentId
      );
    } else {
      void this.native.genericToast(this.translate.instant('contacts.select-before-invite'));
    }
  }

  // Send empty intent response when user cancel the action.
  sendEmptyIntentRes(navBack = false) {
    void this.globalIntentService.sendIntentResponse(
      {},
      this.handledIntentId, navBack
    );
  }
}
