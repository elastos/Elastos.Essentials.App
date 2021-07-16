import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { FormsModule } from '@angular/forms';

import { CRCouncilRegistrationPage } from './pages/registration/registration.page';
import { TranslateModule } from '@ngx-translate/core';

import { HttpClientModule } from '@angular/common/http';

import { CRCouncilManagerRoutingModule } from './routing';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { CRCouncilManagerPage } from './pages/manager/manager.page';

@NgModule({
  declarations: [
    CRCouncilRegistrationPage,
    CRCouncilManagerPage,
  ],
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    HttpClientModule,
    CRCouncilManagerRoutingModule,
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
export class CRCouncilManagerModule {}
