import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { MissingTranslationHandler, MissingTranslationHandlerParams, TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { IonicStorageModule } from '@ionic/storage';

import { DragulaModule } from 'ng2-dragula';
import { AngularFittextModule } from 'angular-fittext';

import { LauncherRoutingModule, EmptyPage } from './routing';
import { TipsPage } from './pages/tips/tips.page';
import { NotificationsPage } from './pages/notifications/notifications.page';

import { ComponentsModule } from './components/components.module';
import { CommonModule } from '@angular/common';
import { HomePage } from './pages/home/home.page';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { OnboardPage } from './pages/onboard/onboard.page';

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
    CommonModule,
    HttpClientModule,
    AngularFittextModule,
    SharedComponentsModule,
    ComponentsModule,
    TranslateModule,
    LauncherRoutingModule
  ],
  providers: [
    //LauncherService
  ],
  bootstrap: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LauncherModule { }
