import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebView } from '@awesome-cordova-plugins/ionic-webview/ngx';
import { IonicModule, Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { StdTransactionComponentModule } from 'src/app/wallet/components/std-transaction/module';
import { DPosRegistrationPage } from './pages/registration/registration.page';
import { DPosUnRegistrationPage } from './pages/unregistration/unregistration.page';
import { DPoSRegistrationRoutingModule } from './routing';


@NgModule({
  declarations: [
    DPosRegistrationPage,
    DPosUnRegistrationPage
  ],
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    HttpClientModule,
    DPoSRegistrationRoutingModule,
    IonicModule,
    IonicStorageModule,
    SharedComponentsModule,
    StdTransactionComponentModule
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
export class DPoSRegistrationModule {}
