import { CommonModule } from "@angular/common";
import { HttpClientModule } from "@angular/common/http";
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Clipboard } from "@awesome-cordova-plugins/clipboard/ngx";
import { WebView } from "@awesome-cordova-plugins/ionic-webview/ngx";
import { IonicModule, Platform } from "@ionic/angular";
import { IonicStorageModule } from "@ionic/storage";
import { TranslateModule } from "@ngx-translate/core";
import { QRCodeModule } from "angularx-qrcode";
import { IonBottomDrawerModule } from "ion-bottom-drawer";
import { ComponentsModule } from "../components/components.module";
import { OptionsComponent } from "../components/options/options.component";
import { ShowQRCodeComponent } from "../components/showqrcode/showqrcode.component";
import { SuccessComponent } from "../components/success/success.component";
import { WarningComponent } from "../components/warning/warning.component";
import { TabsnavPageModule } from "../pages/tabnav/tabnav.module";
import { IdentityRoutingModule } from "../routing";
import { LocalStorage } from "./localstorage";

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
    Platform,
    WebView
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class IdentityModule { }
