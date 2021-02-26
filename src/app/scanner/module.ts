import { NgModule, ErrorHandler, Injectable } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { QRScanner } from '@ionic-native/qr-scanner/ngx';
import { ModalController, AngularDelegate, AlertController } from '@ionic/angular';
import { IonicModule, IonicRouteStrategy, Platform } from '@ionic/angular';
import { RouteReuseStrategy } from '@angular/router';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

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
