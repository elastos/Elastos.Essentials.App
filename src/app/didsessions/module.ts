import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy, Platform } from '@ionic/angular';
import { DIDSessionsRoutingModule } from './routing';
import { QRScanner } from '@ionic-native/qr-scanner/ngx';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { WebView } from '@ionic-native/ionic-webview/ngx';

import { PickIdentityPage } from './pages/pickidentity/pickidentity';
import { CreateIdentityPage } from './pages/createidentity/createidentity';
import { TranslateModule } from '@ngx-translate/core';

import { BackupDIDPage } from './pages/backupdid/backupdid';
import { EditProfilePage } from './pages/editprofile/editprofile';
import { VerifyMnemonicsPage } from './pages/verifymnemonics/verifymnemonics';
import { ImportDIDPage } from './pages/importdid/importdid';
import { FormsModule } from '@angular/forms';
import { ComponentsModule } from './components/components.module';
import { PopupProvider } from './services/popup';
import { OptionsComponent } from './components/options/options.component';
import { WarningComponent } from './components/warning/warning.component';
import { LanguagePage } from './pages/language/language.page';
import { ChooseImportedDIDPage } from './pages/chooseimporteddid/chooseimporteddid.page';
import { ScanPage } from './pages/scan/scan.page';
import { PrintoptionsComponent } from './components/printoptions/printoptions.component';
import { SharedComponentsModule } from '../components/sharedcomponents.module';

@NgModule({
  declarations: [
    LanguagePage,
    PickIdentityPage,
    CreateIdentityPage,
    BackupDIDPage,
    EditProfilePage,
    VerifyMnemonicsPage,
    ImportDIDPage,
    ChooseImportedDIDPage,
    ScanPage,
    OptionsComponent,
    WarningComponent,
    PrintoptionsComponent
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
    BackupDIDPage,
    EditProfilePage,
    VerifyMnemonicsPage,
    ImportDIDPage,
    ChooseImportedDIDPage,
    ScanPage,
    OptionsComponent,
    WarningComponent,
    PrintoptionsComponent
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
