import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { ComponentsModule as WalletComponentsModule } from '../wallet/components/components.module';
import { ComponentsModule } from './components/components.module';
import { HomePage } from './pages/home/home.page';
import { NotificationsPage } from './pages/notifications/notifications.page';
import { OnboardPage } from './pages/onboard/onboard.page';
import { TipsPage } from './pages/tips/tips.page';
import { EmptyPage, LauncherRoutingModule } from './routing';



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
    IonicModule,
    HttpClientModule,
    SharedComponentsModule,
    ComponentsModule,
    TranslateModule,
    LauncherRoutingModule,
    WalletComponentsModule
  ],
  providers: [
    //LauncherService
  ],
  bootstrap: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LauncherModule { }
