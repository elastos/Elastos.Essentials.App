import { Component, OnInit, NgZone } from '@angular/core';
import { NavParams, ModalController } from '@ionic/angular';
import { ProfileService } from '../../services/profile.service';
import { HiveService } from '../../services/hive.service';
import { LocalStorage } from '../../services/localstorage';
import { Events } from '../../services/events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'app-picture',
  templateUrl: './picture.component.html',
  styleUrls: ['./picture.component.scss'],
})
export class PictureComponent implements OnInit {

  public newImg = false;

  constructor(
    private navParams: NavParams,
    private modalCtrl: ModalController,
    private zone: NgZone,
    public profileService: ProfileService,
    public theme: GlobalThemeService,
    public hiveService: HiveService,
    public storage: LocalStorage,
    public events: Events
  ) {
  }

  ngOnInit() {
    this.newImg = false;

    if (this.hiveService.rawImage) {
      console.log('Avatar cred found', this.hiveService.rawImage);
    } else {
      return;
    }
  }

  ionViewWillLeave() {
    // let the editprofile screen to show menu
    this.events.publish('editprofile-showmenu');
  }

  takePicture(sourceType: number) {
    const options: CameraOptions = {
      quality: 90,
      destinationType: 0,
      encodingType: 1,
      mediaType: 0,
      correctOrientation: true,
      sourceType: sourceType,
      targetWidth: 256,
      targetHeight: 256
    };

    navigator.camera.getPicture((imageData) => {
      this.zone.run(() => {
        console.log(imageData);
        // Used for displaying
        this.hiveService.rawImage = 'data:image/png;base64,' + imageData;
        // Used for credential
        this.hiveService.avatar.data = imageData;
        // Notify avatar has changed to prompt publish
        this.newImg = true;
      });
    }, ((err) => {
      console.error(err);
    }), options);
  }

  submit(useImg: boolean): void {
    this.modalCtrl.dismiss({
      useImg: useImg,
      newImg: this.newImg
    });
  }

  /*   submit(useImg: boolean):void {
      this.savingImg = true;
      this.hiveService.ipfsPut(this.hiveService.ipfsObj, this.rawImage).then((result) => {
        if(result["status"] === "success") {
          this.hiveService.imageCid = result["cid"];
          console.log('ipfsPut', result);
          console.log('Image cid', this.hiveService.imageCid);
          localStorage.setItem(this.hiveService.skey, JSON.stringify(result["cid"]));
          this.savingImg = false;
          this.rawImage = "";
          this.modalCtrl.dismiss({
            useImg: useImg
          });
        }
      }).catch((err) => {
        this.savingImg = false;
        alert(err);
      });
    } */
}
