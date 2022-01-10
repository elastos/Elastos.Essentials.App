import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { WebView } from '@awesome-cordova-plugins/ionic-webview/ngx';
import { IonicModule, Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';


@NgModule({
  declarations: [
  ],
  imports: [
    HttpClientModule,
    IonicModule,
    IonicStorageModule,
  ],
  bootstrap: [],
  entryComponents: [
  ],
  providers: [
    Platform,
    WebView
  ],
  schemas: []
})
export class DPoSRegistrationInitModule {}
