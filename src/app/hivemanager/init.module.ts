import { NgModule } from '@angular/core';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { PopupService } from './services/popup.service';

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
    PopupService,
    Platform,
    Clipboard
  ],
  schemas:[]
})
export class HiveManagerInitModule {}
