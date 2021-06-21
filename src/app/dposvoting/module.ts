import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { FormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { HttpClientModule } from '@angular/common/http';

import { DPoSVotingRoutingModule } from './routing';
import { SharedComponentsModule } from '../components/sharedcomponents.module';


@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    HttpClientModule,
    DPoSVotingRoutingModule,
    IonicModule,
    IonicStorageModule,
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
