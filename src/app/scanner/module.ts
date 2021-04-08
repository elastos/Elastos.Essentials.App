import { NgModule } from '@angular/core';
import { QRScanner } from '@ionic-native/qr-scanner/ngx';
import { ModalController, AngularDelegate } from '@ionic/angular';
import { Platform } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { ScannerRoutingModule } from './routing';

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ScanPage } from './pages/scan/scan.page';
import { CommonModule } from '@angular/common';
import { SharedComponentsModule } from '../components/sharedcomponents.module';

@NgModule({
  declarations: [
    ScanPage
  ],
  imports: [
    CommonModule,
    ScannerRoutingModule,
    SharedComponentsModule,
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
  schemas:[CUSTOM_ELEMENTS_SCHEMA] // Needed to find ion-back-button, etc
})
export class ScannerModule {}
