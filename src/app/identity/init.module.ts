import { HttpClientModule } from "@angular/common/http";
import { NgModule } from "@angular/core";
import { Clipboard } from "@awesome-cordova-plugins/clipboard/ngx";
import { WebView } from "@awesome-cordova-plugins/ionic-webview/ngx";
import { IonicModule, Platform } from "@ionic/angular";
import { IonicStorageModule } from "@ionic/storage";
import { TranslateModule } from "@ngx-translate/core";
import { LocalStorage } from "./services/localstorage";

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
    Platform,
    WebView
  ],
  schemas: []
})
export class IdentityInitModule { }
