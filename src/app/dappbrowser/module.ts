import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicStorageModule } from '@ionic/storage';
import { IonicModule, Platform } from '@ionic/angular';
import { DAppBrowserRoutingModule } from './routing';
import { FormsModule } from '@angular/forms';
import { Clipboard } from '@ionic-native/clipboard/ngx';

import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { HttpClientModule } from '@angular/common/http';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { TranslateModule } from '@ngx-translate/core';
import { HomePage } from './pages/home/home';

@NgModule({
  declarations: [
    HomePage,
  ],
  imports: [
    CommonModule,
    SharedComponentsModule,
    DAppBrowserRoutingModule,
    HttpClientModule,
    FormsModule,
    IonicStorageModule,
    IonicModule,
    TranslateModule
  ],
  bootstrap: [],
  entryComponents: [
    HomePage
  ],
  providers: [
    Platform
  ]
})
export class DAppBrowserModule {}
