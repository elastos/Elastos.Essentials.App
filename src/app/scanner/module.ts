import { NgModule, ErrorHandler, Injectable } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { QRScanner } from '@ionic-native/qr-scanner/ngx';
import { ModalController, AngularDelegate, AlertController } from '@ionic/angular';
import { IonicModule, IonicRouteStrategy, Platform } from '@ionic/angular';
import { RouteReuseStrategy } from '@angular/router';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { ScannerRoutingModule } from './routing';

import { zh } from '../../assets/scanner/languages/zh';
import { en } from '../../assets/scanner/languages/en';
import { fr } from '../../assets/scanner/languages/fr';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ScanPage } from './pages/scan/scan.page';
import { CommonModule } from '@angular/common';
import { SharedComponentsModule } from '../components/sharedcomponents.module';

export class CustomTranslateLoader implements TranslateLoader {
  public getTranslation(lang: string): Observable<any> {
      return Observable.create(observer => {
          switch (lang) {
              case 'zh':
                observer.next(zh);
                break;
              case 'fr':
                observer.next(fr);
                break;
              case 'en':
              default:
                observer.next(en);
          }

          observer.complete();
      });
  }
}

export function TranslateLoaderFactory() {
  return new CustomTranslateLoader();
}

@NgModule({
  declarations: [
    ScanPage
  ],
  imports: [
    CommonModule,
    ScannerRoutingModule,
    SharedComponentsModule
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
