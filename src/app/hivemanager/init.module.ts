import { NgModule } from '@angular/core';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [
  ],
  imports: [
    TranslateModule,
    IonicStorageModule.forRoot()
  ],
  bootstrap: [],
  entryComponents: [
  ],
  providers: [
    Platform,
    Clipboard
  ],
  schemas:[]
})
export class HiveManagerInitModule {}
