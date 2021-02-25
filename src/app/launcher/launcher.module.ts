import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { IonicStorageModule } from '@ionic/storage';

import { DragulaModule } from 'ng2-dragula';
import { AngularFittextModule } from 'angular-fittext';

import { zh } from '../../assets/launcher/languages/zh';
import { en } from '../../assets/launcher/languages/en';
import { fr } from '../../assets/launcher/languages/fr';

import { LauncherRoutingModule, EmptyPage } from './routing.module';
import { TipsPage } from './pages/tips/tips.page';
import { NotificationsPage } from './pages/notifications/notifications.page';

import { ComponentsModule } from './components/components.module';
import { CommonModule } from '@angular/common';
import { HomePage } from './pages/home/home.page';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { SharedServicesModule } from '../services/sharedservices.module';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { OnboardPage } from './pages/onboard/onboard.page';

export class CustomTranslateLoader implements TranslateLoader {
  public getTranslation(lang: string): Observable<any> {
    console.log("getTranslation, lang=", lang)
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
    HomePage,
    NotificationsPage,
    TipsPage,
    OnboardPage,
    //SafePipe,
  ],
  entryComponents: [
    HomePage,
    EmptyPage,
    NotificationsPage,
    TipsPage
  ],
  imports: [
    IonicModule.forRoot(),
    CommonModule,
    HttpClientModule,
    AngularFittextModule,
    SharedComponentsModule,
    SharedServicesModule,
    ComponentsModule,
    LauncherRoutingModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (TranslateLoaderFactory)
      }
    }),
  ],
  providers: [
    //LauncherService
  ],
  bootstrap: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LauncherModule { }
