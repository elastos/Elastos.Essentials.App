import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';

import { LauncherRoutingModule, EmptyPage } from './routing';
import { TipsPage } from './pages/tips/tips.page';
import { NotificationsPage } from './pages/notifications/notifications.page';

import { ComponentsModule } from './components/components.module';
import { CommonModule } from '@angular/common';
import { HomePage } from './pages/home/home.page';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
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
