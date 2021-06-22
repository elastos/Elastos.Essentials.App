import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { HttpClientModule } from "@angular/common/http";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { IonicModule, Platform } from "@ionic/angular";
import { IonicStorageModule } from "@ionic/storage";
import { IdentityRoutingModule } from "./routing";
import { Clipboard } from "@ionic-native/clipboard/ngx";
import { QRCodeModule } from "angularx-qrcode";
import { IonBottomDrawerModule } from "ion-bottom-drawer";
import { TranslateModule } from "@ngx-translate/core";
import { WebView } from "@ionic-native/ionic-webview/ngx";
import { ComponentsModule } from "./components/components.module";
import { LocalStorage } from "./services/localstorage";
import { PopupProvider } from "./services/popup";
import { ShowQRCodeComponent } from "./components/showqrcode/showqrcode.component";
import { WarningComponent } from "./components/warning/warning.component";
import { OptionsComponent } from "./components/options/options.component";
import { SuccessComponent } from "./components/success/success.component";
import { TabsnavPageModule } from "./pages/tabnav/tabnav.module";

@NgModule({
  declarations: [
    OptionsComponent,
    WarningComponent,
    SuccessComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    IonicModule,
    IdentityRoutingModule,
    ComponentsModule,
    FormsModule,
    IonBottomDrawerModule,
    QRCodeModule,
    IonicStorageModule,
    TranslateModule,
    TabsnavPageModule
  ],
  bootstrap: [],
  entryComponents: [
    ShowQRCodeComponent,
    OptionsComponent,
    WarningComponent,
    SuccessComponent
  ],
  providers: [
    Clipboard,
    LocalStorage,
    PopupProvider,
    Platform,
    WebView
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class IdentityModule { }
