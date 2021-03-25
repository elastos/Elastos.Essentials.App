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

import { CountryPickerPage } from "./pages/countrypicker/countrypicker";
import { EditProfilePage } from "./pages/editprofile/editprofile";
import { PublishPage } from "./pages/publish/publish";

import { CredentialAccessRequestPage } from "./pages/intents/credentialaccessrequest/credentialaccessrequest";
import { RegisterApplicationProfileRequestPage } from "./pages/intents/regappprofilerequest/regappprofilerequest";
import { SetHiveProviderRequestPage } from "./pages/intents/sethiveproviderrequest/sethiveproviderrequest";

import { LocalStorage } from "./services/localstorage";
import { PopupProvider } from "./services/popup";
import { ShowQRCodeComponent } from "./components/showqrcode/showqrcode.component";
import { ProfileEntryPickerPage } from "./pages/profileentrypicker/profileentrypicker";

import { SignRequestPage } from "./pages/intents/signrequest/signrequest";
import { AppIdCredentialIssueRequestPage } from "./pages/intents/appidcredentialissuerequest/appidcredentialissuerequest";
import { CredentialIssueRequestPage } from "./pages/intents/credentialissuerequest/credentialissuerequest";
import { WarningComponent } from "./components/warning/warning.component";
import { OptionsComponent } from "./components/options/options.component";
import { PictureComponent } from "./components/picture/picture.component";
import { CredentialImportRequestPage } from "./pages/intents/credentialimportrequest/credentialimportrequest";
import { CredentialDetailsPage } from "./pages/credentialdetails/credentialdetails.page";
import { SettingsPage } from "./pages/settings/settings.page";
import { AdvancedSettingsPage } from "./pages/advanced-settings/advanced-settings.page";
import { SuccessComponent } from "./components/success/success.component";
import { SharedComponentsModule } from "src/app/components/sharedcomponents.module";
import { ExportmnemonicPage } from "./pages/exportmnemonic/exportmnemonic.page";
import { TabsnavPageModule } from "./pages/tabnav/tabnav.module";

@NgModule({
  declarations: [
    OptionsComponent,
    WarningComponent,
    PictureComponent,
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
    PictureComponent,
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
