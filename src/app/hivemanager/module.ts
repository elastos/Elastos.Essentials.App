import { NgModule, ErrorHandler, Injectable } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy, Platform } from '@ionic/angular';
import { AppRoutingModule, EmptyPage } from './routing';
import { IonicStorageModule } from '@ionic/storage';
import { SignInPage } from './pages/signin/signin.page';
import { PickProviderPage } from './pages/pickprovider/pickprovider.page';
import { StorageService } from './services/storage.service';
import { PopupService } from './services/popup.service';
import { TranslateService, TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { AdminProvidersListPage } from './pages/admin/adminproviderslist/adminproviderslist.page';
import { AdminProviderEditPage } from './pages/admin/adminprovideredit/adminprovideredit.page';
import { FormsModule } from '@angular/forms';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { PickPlanPage } from './pages/pickplan/pickplan.page';
import { PickPlanPurchasePage } from './pages/pickplanpurchase/pickplanpurchase.page';
import { ComponentsModule } from './components/components.module';

import { zh } from './../../assets/hivemanager/languages/zh';
import { en } from './../../assets/hivemanager/languages/en';
import { fr } from './../../assets/hivemanager/languages/fr';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

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
    EmptyPage,
    SignInPage,
    PickProviderPage,
    PickPlanPage,
    PickPlanPurchasePage,
    AdminProvidersListPage,
    AdminProviderEditPage
  ],
  imports: [
    CommonModule,
    BrowserModule,
    FormsModule,
    ComponentsModule,
    AppRoutingModule,
    TranslateModule.forRoot({
      loader: {
          provide: TranslateLoader,
          useFactory: (TranslateLoaderFactory)
      }
    }),
    IonicStorageModule.forRoot()
  ],
  bootstrap: [],
  entryComponents: [
    EmptyPage
  ],
  providers: [
    StorageService,
    PopupService,
    Platform,
    Clipboard
  ],
  schemas:[CUSTOM_ELEMENTS_SCHEMA] // Needed to find ion-back-button, etc
})
export class HiveManagerModule {}
