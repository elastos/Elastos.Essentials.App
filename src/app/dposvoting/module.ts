import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { IonicImageLoader } from 'ionic-image-loader';
import { WebView } from '@ionic-native/ionic-webview/ngx';

import { HttpClientModule } from '@angular/common/http';

import { DPoSVotingRoutingModule } from './routing';
import { SharedComponentsModule } from '../components/sharedcomponents.module';

@NgModule({
  declarations: [

  ],
  imports: [
    CommonModule,
    HttpClientModule,
    DPoSVotingRoutingModule,
    IonicModule,
    IonicStorageModule,
    IonicImageLoader,
    SharedComponentsModule
  ],
  bootstrap: [],
  entryComponents: [
  ],
  providers: [
    Platform,
    WebView
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DPoSVotingModule {}
