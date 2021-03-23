import { NgModule } from '@angular/core';
import { IonicStorageModule } from '@ionic/storage';
import { StorageService } from './services/storage.service';
import { TranslateModule } from '@ngx-translate/core';
import { PopupService } from './services/popup.service';
import { Platform } from '@ionic/angular';
import { Clipboard } from '@ionic-native/clipboard/ngx';

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
    StorageService,
    PopupService,
    Platform,
    Clipboard
  ],
  schemas:[]
})
export class HiveManagerInitModule {}
