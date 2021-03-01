import { Component, OnInit, NgZone } from '@angular/core';
import { NavParams, ModalController } from '@ionic/angular';

import { FriendsService } from '../../services/friends.service';
import { AppService } from '../../services/app.service';

import { Avatar } from '../../models/avatar';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'app-picture',
  templateUrl: './picture.component.html',
  styleUrls: ['./picture.component.scss'],
})
export class PictureComponent implements OnInit {

  public oldAvatar: Avatar;
  public avatar: Avatar;

  constructor(
    private friendsService: FriendsService,
    public appService: AppService,
    public theme: GlobalThemeService,
    private navParams: NavParams,
    public modalCtrl: ModalController,
    private zone: NgZone,
  ) {
  }

  ngOnInit() {
    if(JSON.parse(this.navParams.get('avatar')) !== null) {
      console.log('Contact has picture');
      this.oldAvatar = JSON.parse(this.navParams.get('avatar'));
      this.avatar = JSON.parse(this.navParams.get('avatar'));
    } else {
      this.avatar = {
        contentType : "image/jpeg",
        data : null
      }
    }

    console.log('Current avatar', this.avatar);
  }

  ionViewWillEnter() {
    this.appService.setTitleBarBackKeyShown(true, false);
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
        console.log('Image data', imageData);
        this.avatar.data = imageData;
      });
    }, ((err) => {
      console.error(err);
    }), options);
  }

  submit(useImg: boolean): void {
    if(useImg) {
      this.modalCtrl.dismiss({
        useImg: true,
        avatar: this.avatar
      });
    } else {
      this.modalCtrl.dismiss({
        useImg: false,
        avatar: null
      });
    }
  }
}
