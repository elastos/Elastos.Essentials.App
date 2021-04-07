import { NgModule } from '@angular/core';
import { IonicStorageModule } from '@ionic/storage';
import { IonicModule, Platform } from '@ionic/angular';
import { Clipboard } from '@ionic-native/clipboard/ngx';

import { SplashScreen } from '@ionic-native/splash-screen/ngx';
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
    SplashScreen,
    Platform,
    Clipboard
  ]
})
export class DeveloperToolsInitModule {}
