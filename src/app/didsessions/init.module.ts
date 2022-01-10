import { NgModule } from '@angular/core';
import { WebView } from '@awesome-cordova-plugins/ionic-webview/ngx';
import { QRScanner } from '@ionic-native/qr-scanner/ngx';
import { IonicModule, Platform } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { PopupProvider } from './services/popup';

@NgModule({
  declarations: [
  ],
  imports: [
    IonicModule,
    TranslateModule,
  ],
  entryComponents: [
  ],
  providers: [
    QRScanner,
    Platform,
    PopupProvider,
    WebView
  ],
  schemas: []
})
export class DIDSessionsInitModule {}
