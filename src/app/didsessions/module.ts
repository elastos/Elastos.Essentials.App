import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebView } from '@awesome-cordova-plugins/ionic-webview/ngx';
import { QRScanner } from '@ionic-native/qr-scanner/ngx';
import { IonicModule, LoadingController, Platform } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { ComponentsModule } from './components/components.module';
import { ChooseImportedDIDPage } from './pages/chooseimporteddid/chooseimporteddid.page';
import { CreateIdentityPage } from './pages/createidentity/createidentity';
import { EditProfilePage } from './pages/editprofile/editprofile';
import { ImportDIDPage } from './pages/importdid/importdid';
import { LanguagePage } from './pages/language/language.page';
import { PickIdentityPage } from './pages/pickidentity/pickidentity';
import { PrepareDIDPage } from './pages/preparedid/preparedid';
import { ScanPage } from './pages/scan/scan.page';
import { SettingsSelectNetPage } from './pages/settings-select-net/settings-select-net.page';
import { SettingsPage } from './pages/settings/settings.page';
import { DIDSessionsRoutingModule } from './routing';

@NgModule({
  declarations: [
    LanguagePage,
    CreateIdentityPage,
    EditProfilePage,
    ImportDIDPage,
    ChooseImportedDIDPage,
    PrepareDIDPage,
    ScanPage,
    SettingsPage,
    SettingsSelectNetPage,
    PickIdentityPage
  ],
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ComponentsModule,
    SharedComponentsModule,
    TranslateModule,
    DIDSessionsRoutingModule,
    InlineSVGModule
  ],
  entryComponents: [
  ],
  providers: [
    QRScanner,
    Platform,
    WebView,
    LoadingController
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DIDSessionsModule { }
