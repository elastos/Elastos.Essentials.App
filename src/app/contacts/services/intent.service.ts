import { Injectable, NgZone } from '@angular/core';
import { Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { FriendsService } from './friends.service';

@Injectable({
  providedIn: 'root'
})
export class IntentService {
  private intentSubscription: Subscription = null;

  constructor(
    private zone: NgZone,
    private friendsService: FriendsService,
    private intentService: GlobalIntentService,
    private globalIntentService: GlobalIntentService,
  ) {
  }

  init() {
    this.intentSubscription = this.intentService.intentListener.subscribe((receivedIntent)=>{
      if(receivedIntent)
        this.onReceiveIntent(receivedIntent);
    })
  }

  stop() {
    if (this.intentSubscription) {
      this.intentSubscription.unsubscribe();
      this.intentSubscription = null;
    }
  }

  onReceiveIntent(ret: EssentialsIntentPlugin.ReceivedIntent) {
    this.friendsService.managerService.handledIntentId = ret.intentId;

    switch (ret.action) {
      case "handlescannedcontent_did":
        Logger.log('contacts', 'handlescannedcontent_did intent', ret);
        this.zone.run(() => {
          void this.friendsService.addContactByIntent(ret.params.did, ret.params.carrier);
          this.sendEmptyIntentRes();
        });
        break;
      case "https://contact.elastos.net/addfriend":
        Logger.log('contacts', 'addfriend intent', ret);
        this.zone.run(() => {
          void this.friendsService.addContactByIntent(ret.params.did, ret.params.carrier);
        });
        break;
      case "https://contact.elastos.net/viewfriendinvitation":
        Logger.log('contacts', 'viewfriendinvitation intent', ret);
        this.zone.run(() => {
          this.friendsService.contactNotifierInviationId = ret.params.invitationid;
          void this.friendsService.addContactByIntent(ret.params.did);
        });
        break;
      case "share":
        Logger.log('contacts', 'share intent', ret);

        this.friendsService.shareIntentData = {
          title: ret.params.title,
          url: ret.params.url
        };

        this.zone.run(() => {
          this.friendsService.getContacts(false, 'share');
        });
        break;
      case "https://contact.elastos.net/viewfriend":
        Logger.log('contacts', 'viewfriend intent', ret);
        this.zone.run(() => {
          this.friendsService.viewContact(ret.params.did);
        });
        break;
      case "https://contact.elastos.net/pickfriend":
        Logger.log('contacts', 'pickfriend intent', ret);
        this.zone.run(() => {
          let params = ret.params;
          // Single Invite, No Filter
          if(
            !params.hasOwnProperty('singleSelection') && !params.hasOwnProperty('filter') ||
            params.hasOwnProperty('singleSelection') && params.singleSelection === true && !params.hasOwnProperty('filter'))
          {
            Logger.log('contacts', 'pickfriend intent is single selection without filter');
            this.friendsService.getContacts(true, 'pickfriend');
          }
          // Multiple Invite, No Filter
          if(params.hasOwnProperty('singleSelection') && params.singleSelection === false && !params.hasOwnProperty('filter')) {
            Logger.log('contacts', 'pickfriend intent is multiple selection without filter');
            this.friendsService.getContacts(false, 'pickfriend');
          }
          // Single Invite, With Filter
          if(
            !params.hasOwnProperty('singleSelection') && params.hasOwnProperty('filter') ||
            params.hasOwnProperty('singleSelection') && params.singleSelection === true && params.hasOwnProperty('filter'))
          {
            Logger.log('contacts', 'pickfriend intent is single selection and filtered by credential');
            this.friendsService.getFilteredContacts(true, ret);
          }
          // Multiple Invite, With Filter
          if(params.hasOwnProperty('singleSelection') && params.singleSelection === false && params.hasOwnProperty('filter')) {
            Logger.log('contacts', 'pickfriend intent is multiple selection and filtered by credential');
            this.friendsService.getFilteredContacts(false, ret);
          }
        });

        break;
    }
  }

  // Just notify the qrscanner to quit
  sendEmptyIntentRes() {
    void this.globalIntentService.sendIntentResponse(
      {},
      this.friendsService.managerService.handledIntentId
    );
  }
}
