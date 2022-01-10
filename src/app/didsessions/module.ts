import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebView } from '@awesome-cordova-plugins/ionic-webview/ngx';
import { QRScanner } from '@ionic-native/qr-scanner/ngx';
import { IonicModule, Platform } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { ComponentsModule } from './components/components.module';
import { OptionsComponent } from './components/options/options.component';
import { WarningComponent } from './components/warning/warning.component';
import { ChooseImportedDIDPage } from './pages/chooseimporteddid/chooseimporteddid.page';
import { CreateIdentityPage } from './pages/createidentity/createidentity';
import { EditProfilePage } from './pages/editprofile/editprofile';
import { ImportDIDPage } from './pages/importdid/importdid';
import { LanguagePage } from './pages/language/language.page';
import { PickIdentityPage } from './pages/pickidentity/pickidentity';
import { PrepareDIDPage } from './pages/preparedid/preparedid';
import { ScanPage } from './pages/scan/scan.page';
import { DIDSessionsRoutingModule } from './routing';
import { PopupProvider } from './services/popup';



@NgModule({
  declarations: [
    LanguagePage,
    PickIdentityPage,
    CreateIdentityPage,
    EditProfilePage,
    ImportDIDPage,
    ChooseImportedDIDPage,
    PrepareDIDPage,
    ScanPage,
    OptionsComponent,
    WarningComponent
  ],
  imports: [
    IonicModule,
    CommonModule,
    DIDSessionsRoutingModule,
    FormsModule,
    ComponentsModule,
    SharedComponentsModule,
    TranslateModule,
  ],
  entryComponents: [
    LanguagePage,
    PickIdentityPage,
    CreateIdentityPage,
    EditProfilePage,
    ImportDIDPage,
    ChooseImportedDIDPage,
    PrepareDIDPage,
    ScanPage,
    OptionsComponent,
    WarningComponent
  ],
  providers: [
    QRScanner,
    Platform,
    PopupProvider,
    WebView
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DIDSessionsModule {}
