import { NgModule } from '@angular/core';
import { IonicModule, Platform } from '@ionic/angular';
import { QRScanner } from '@ionic-native/qr-scanner/ngx';
import { WebView } from '@ionic-native/ionic-webview/ngx';
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
