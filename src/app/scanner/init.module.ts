import { NgModule } from '@angular/core';
import { QRScanner } from '@ionic-native/qr-scanner/ngx';
import { ModalController, AngularDelegate } from '@ionic/angular';
import { Platform } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [
  ],
  imports: [
    TranslateModule
  ],
  exports: [],
  bootstrap: [],
  entryComponents: [],
  providers: [
    QRScanner,
    ModalController,
    AngularDelegate,
    Platform
  ],
  schemas:[]
})
export class ScannerInitModule {}
