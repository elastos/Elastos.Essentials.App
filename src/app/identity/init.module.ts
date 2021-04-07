import { NgModule } from "@angular/core";
import { HttpClientModule } from "@angular/common/http";
import { IonicModule, Platform } from "@ionic/angular";
import { IonicStorageModule } from "@ionic/storage";
import { Clipboard } from "@ionic-native/clipboard/ngx";
import { TranslateModule } from "@ngx-translate/core";
import { WebView } from "@ionic-native/ionic-webview/ngx";

import { LocalStorage } from "./services/localstorage";
import { PopupProvider } from "./services/popup";
@NgModule({
  declarations: [
  ],
  imports: [
    HttpClientModule,
    IonicModule,
    IonicStorageModule,
    TranslateModule
  ],
  bootstrap: [],
  entryComponents: [
  ],
  providers: [
    Clipboard,
    LocalStorage,
    PopupProvider,
    Platform,
    WebView
  ],
  schemas: []
})
export class IdentityInitModule { }
