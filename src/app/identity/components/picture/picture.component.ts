import { Component, OnInit, NgZone, ViewChild } from '@angular/core';
import { NavParams, ModalController } from '@ionic/angular';
import { ProfileService } from '../../services/profile.service';
import { LocalStorage } from '../../services/localstorage';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Logger } from 'src/app/logger';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot, BuiltInIcon, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Events } from 'src/app/services/events.service';
import { pictureMimeType } from 'src/app/helpers/picture.helpers';
import { GlobalNativeService } from 'src/app/services/global.native.service';

@Component({
  selector: 'app-picture',
  templateUrl: './picture.component.html',
  styleUrls: ['./picture.component.scss'],
})
export class PictureComponent implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  /**
   * Static object used to receive the existing picture, and return the new one if any.
   */
  public static shared: {
    dataUrlImageIn?: string; // Existing picture to display as "current picture", if any. Format: data:image/xxx...
    rawBase64ImageOut?: string; // Newly chosen picture, if different from the received one. Base64 encoded.
    dataUrlImageOut?: string; // Same as rawImageOut but as a data url (data:image/png...)
  } = {};

  public dataUrlImage: string = null;

  constructor(
    private modalCtrl: ModalController,
    private zone: NgZone,
    public profileService: ProfileService,
    public theme: GlobalThemeService,
    public storage: LocalStorage,
    private native: GlobalNativeService,
    public events: Events
  ) {}

  ngOnInit() {
    if (PictureComponent.shared.dataUrlImageIn) {
      Logger.log('Identity', 'Showing picture chooser with existing image');
      PictureComponent.shared.dataUrlImageOut = PictureComponent.shared.dataUrlImageIn;
      // TODO PictureComponent.shared.rawBase64ImageOut = PictureComponent.shared.dataUrlImageIn.substr(PictureComponent.shared.dataUrlImageIn.lastIndexOf());
    } else {
      Logger.log('Identity', 'Showing picture chooser with no existing image');
      PictureComponent.shared.dataUrlImageOut = null;
      PictureComponent.shared.rawBase64ImageOut = null;
    }
  }

  ionViewWillEnter() {
    this.titleBar.setNavigationMode(null); // Modals are not part of page stack, therefore we dont use navigation mode
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: null, iconPath: BuiltInIcon.CLOSE }); // Replace ela logo with close icon
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      void this.modalCtrl.dismiss();
    });

    if (PictureComponent.shared.dataUrlImageIn) {
      this.dataUrlImage = PictureComponent.shared.dataUrlImageIn;
    }
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    // let the editprofile screen to show menu
    this.events.publish('editprofile-showmenu');
  }

  takePicture(sourceType: number) {
    const options: CameraOptions = {
      quality: 90,
      destinationType: 0,
      encodingType: 1, // PNG
      mediaType: 0,
      correctOrientation: true,
      sourceType: sourceType,
      targetWidth: 350,
      targetHeight: 350
    };

    navigator.camera.getPicture((imageData) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.zone.run(async () => {
        //Logger.log('Identity', "Chosen image data base64:", imageData);

        if (imageData) {
          let mimeType = await pictureMimeType(imageData);

          if (["image/png", "image/jpg", "image/jpeg"].indexOf(mimeType) < 0) {
            this.native.genericToast('identity.not-a-valid-picture');
            return;
          }

          PictureComponent.shared.rawBase64ImageOut = imageData;
          PictureComponent.shared.dataUrlImageOut = 'data:'+mimeType+';base64,' + imageData;
          this.dataUrlImage = PictureComponent.shared.dataUrlImageOut;
        }
      });
    }, ((err) => {
      Logger.error('identity', err);
    }), options);
  }

  submit(useImg: boolean): void {
    void this.modalCtrl.dismiss({
      useImg: useImg
    });
  }
}
