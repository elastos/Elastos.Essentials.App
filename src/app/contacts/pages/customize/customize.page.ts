import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { IonInput, ModalController } from '@ionic/angular';

import { FriendsService } from '../../services/friends.service';

import { PictureComponent } from '../../components/picture/picture.component';

import { Avatar } from '../../models/avatar';
import { AppService } from '../../services/app.service';
import { PopupService } from '../../services/popup.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';

@Component({
  selector: 'app-customize',
  templateUrl: './customize.page.html',
  styleUrls: ['./customize.page.scss'],
})
export class CustomizePage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;
  @ViewChild('input', {static: false}) input: IonInput;

  public realName: string;

  public id = '';
  public name = '';
  public gender = '';
  public avatar: Avatar = null;
  public note = '';

  public customName = '';
  public customNote = '';
  public contactAddedWithNoName: boolean;

  constructor(
    private friendsService: FriendsService,
    public appService: AppService,
    public theme: GlobalThemeService,
    private route: ActivatedRoute,
    private modalCtrl: ModalController,
    public translate: TranslateService,
    public popupService: PopupService
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params) {
        Logger.log('contacts', 'Customizing contact', params);
        this.id = params.id;
        this.realName = params.name;
        this.note = params.customNote;

        this.avatar = JSON.parse(params.avatar);
        Logger.log('contacts', 'Customizing avatar', this.avatar);

        // If contact's name is a real name or they don't have a name at all,
        // show blank input, else show their custom name
        if(
          !params.name && params.customName && params.customName === 'Anonymous Contact' ||
          !params.name && !params.customName ||
          params.name && !params.customName
        ) {
          this.name = '';
        }
        if(
          !params.name && params.customName && params.customName !== 'Anonymous Contact' ||
          params.name && params.customName && params.customName !== 'Anonymous Contact'
        ) {
          this.name = params.customName;
        }

        // If contact was just added and has no name, prompt customize intro
        if(params.contactAddedWithNoName === 'true') {
          this.contactAddedWithNoName = true;
        } else {
          this.contactAddedWithNoName = false;
        }

        Logger.log('contacts', 'Contact recently added and has no name?', this.contactAddedWithNoName);
        this.customName = this.name;
        this.customNote = this.note;
      }
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('contacts.customize-contact'));
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, null);
  }

  ionViewWillLeave() {
  }

  ionViewDidEnter() {
    setTimeout(() => {
      void this.input.setFocus();
    }, 200);
  }

  nameChanged(name) {
    if(!name) {
      this.customName = '';
    }
  }

  noteChanged(note) {
    if(!note) {
      this.customNote = '';
    }
  }

  async getPhoto() {
    this.popupService.avatarModal = await this.modalCtrl.create({
      component: PictureComponent,
      componentProps: {
        avatar: JSON.stringify(this.avatar)
      },
    });
    this.popupService.avatarModal.onDidDismiss().then((params) => {
      this.popupService.avatarModal = null;
      if(params.data) {
        if(params.data.useImg && params.data.avatar) {
          this.avatar = params.data.avatar
        } else {
          this.avatar = null;
        }
      }
    });
    this.popupService.avatarModal.present();
  }

  customizeContact() {
    if(!this.realName && !this.customName ) {
      this.customName = this.translate.instant('contacts.anonymous-contact');
    }

    void this.friendsService.customizeContact(this.id, this.customName, this.customNote, this.avatar);
  }
}
