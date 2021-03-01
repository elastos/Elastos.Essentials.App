import { Injectable, NgZone } from '@angular/core';
import { Platform, NavController } from '@ionic/angular';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { ReceivedIntent, TemporaryAppManagerPlugin } from 'src/app/TMP_STUBS';
import { FriendsService } from './friends.service';

@Injectable({
  providedIn: 'root'
})
export class IntentService {
  constructor(
    private platform: Platform,
    private zone: NgZone,
    private navCtrl: NavController,
    private friendsService: FriendsService,
    private appManager: TemporaryAppManagerPlugin,
    private intentService: GlobalIntentService
  ) {
  }

  init() {
    this.intentService.intentListener.subscribe((receivedIntent)=>{
      this.onReceiveIntent(receivedIntent);
    })
  }

  onReceiveIntent(ret: ReceivedIntent) {
    console.log("Intent received", ret, JSON.stringify(ret));
    this.friendsService.managerService.handledIntentId = ret.intentId;

    switch (ret.action) {
      case "handlescannedcontent_did":
        console.log('handlescannedcontent_did intent', ret);
        this.zone.run(() => {
          this.friendsService.addContactByIntent(ret.params.did, ret.params.carrier);
          this.sendEmptyIntentRes();
        });
        break;
      case "https://contact.elastos.net/addfriend":
        console.log('addfriend intent', ret);
        this.zone.run(() => {
          this.friendsService.addContactByIntent(ret.params.did, ret.params.carrier);
        });
        break;
      case "https://contact.elastos.net/viewfriendinvitation":
        console.log('viewfriendinvitation intent', ret);
        this.zone.run(() => {
          this.friendsService.contactNotifierInviationId = ret.params.invitationid;
          this.friendsService.addContactByIntent(ret.params.did);
        });
        break;
      case "share":
        console.log('share intent', ret);

        this.friendsService.shareIntentData = {
          title: ret.params.title,
          url: ret.params.url
        };

        this.zone.run(() => {
          this.friendsService.getContacts(false, 'share');
        });
        break;
      case "https://contact.elastos.net/viewfriend":
        console.log('viewfriend intent', ret);
        this.zone.run(() => {
          this.friendsService.viewContact(ret.params.did);
        });
        break;
      case "https://contact.elastos.net/pickfriend":
        console.log('pickfriend intent', ret);
        this.zone.run(() => {
          let params = ret.params;
          // Single Invite, No Filter
          if(
            !params.hasOwnProperty('singleSelection') && !params.hasOwnProperty('filter') ||
            params.hasOwnProperty('singleSelection') && params.singleSelection === true && !params.hasOwnProperty('filter'))
          {
            console.log('pickfriend intent is single selection without filter');
            this.friendsService.getContacts(true, 'pickfriend');
          }
          // Multiple Invite, No Filter
          if(params.hasOwnProperty('singleSelection') && params.singleSelection === false && !params.hasOwnProperty('filter')) {
            console.log('pickfriend intent is multiple selection without filter');
            this.friendsService.getContacts(false, 'pickfriend');
          }
          // Single Invite, With Filter
          if(
            !params.hasOwnProperty('singleSelection') && params.hasOwnProperty('filter') ||
            params.hasOwnProperty('singleSelection') && params.singleSelection === true && params.hasOwnProperty('filter'))
          {
            console.log('pickfriend intent is single selection and filtered by credential');
            this.friendsService.getFilteredContacts(true, ret);
          }
          // Multiple Invite, With Filter
          if(params.hasOwnProperty('singleSelection') && params.singleSelection === false && params.hasOwnProperty('filter')) {
            console.log('pickfriend intent is multiple selection and filtered by credential');
            this.friendsService.getFilteredContacts(false, ret);
          }
        });

        break;
    }
  }

  // Just notify the qrscanner to quit
  sendEmptyIntentRes() {
    this.appManager.sendIntentResponse(
      "",
      {},
      this.friendsService.managerService.handledIntentId
    );
  }
}
