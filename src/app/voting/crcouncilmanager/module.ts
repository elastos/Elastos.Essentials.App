import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { IonicModule, Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { CRCouncilManagerPage } from './pages/manager/manager.page';
import { CRCouncilRegistrationPage } from './pages/registration/registration.page';
import { CRCouncilManagerRoutingModule } from './routing';




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
