import { NgModule } from '@angular/core';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { LottieSplashScreen } from '@awesome-cordova-plugins/lottie-splash-screen/ngx';
import { IonicModule, Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';


@NgModule({
  declarations: [
  ],
  imports: [
    IonicStorageModule,
    IonicModule,
    TranslateModule
  ],
  bootstrap: [],
  entryComponents: [
  ],
  providers: [
    LottieSplashScreen,
    Platform,
    Clipboard
  ]
})
export class DeveloperToolsInitModule {}
