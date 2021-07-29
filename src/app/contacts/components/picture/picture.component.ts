import { Component, OnInit, NgZone, ViewChild } from '@angular/core';
import { NavParams, ModalController } from '@ionic/angular';

import { AppService } from '../../services/app.service';

import { Avatar } from '../../models/avatar';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarNavigationMode, BuiltInIcon, TitleBarIconSlot, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';

@Component({
  selector: 'app-picture',
  templateUrl: './picture.component.html',
  styleUrls: ['./picture.component.scss'],
})
export class PictureComponent implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public oldAvatar: Avatar;
  public avatar: Avatar;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public appService: AppService,
    public theme: GlobalThemeService,
    private navParams: NavParams,
    public modalCtrl: ModalController,
    private zone: NgZone,
  ) {
  }

  ngOnInit() {
    if(JSON.parse(this.navParams.get('avatar')) !== null) {
      Logger.log('contacts', 'Contact has picture');
      this.oldAvatar = JSON.parse(this.navParams.get('avatar'));
      this.avatar = JSON.parse(this.navParams.get('avatar'));
    } else {
      this.avatar = new Avatar("image/jpeg", null);
    }

    Logger.log('contacts', 'Current avatar', this.avatar);
  }

  ionViewWillEnter() {
    this.titleBar.setNavigationMode(null); // Modals are not part of page stack, therefore we dont use navigation mode
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: null, iconPath: BuiltInIcon.CLOSE }); // Replace ela logo with close icon
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      this.appService.onTitleBarItemClicked(icon);
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  takePicture(sourceType: number) {
    const options: CameraOptions = {
      quality: 90,
      destinationType: 0,
      encodingType: 0,
      mediaType:0,
      correctOrientation: true,
      sourceType: sourceType,
      targetWidth: 256,
      targetHeight: 256
    };

    navigator.camera.getPicture((imageData) => {
      this.zone.run(() => {
        Logger.log('contacts', 'Image data', imageData);
        this.avatar.data = imageData;
      });
    }, ((err) => {
      Logger.error('contacts', err);
    }), options);
  }

  submit(useImg: boolean): void {
    if(useImg) {
      void this.modalCtrl.dismiss({
        useImg: true,
        avatar: this.avatar
      });
    } else {
      void this.modalCtrl.dismiss({
        useImg: false,
        avatar: null
      });
    }
  }
}
