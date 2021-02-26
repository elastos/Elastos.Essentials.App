import { NgModule, ErrorHandler, Injectable, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy, Platform } from '@ionic/angular';
import { DIDSessionsRoutingModule } from './routing';
import { QRScanner } from '@ionic-native/qr-scanner/ngx';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { IonicImageLoader } from 'ionic-image-loader';
import { WebView } from '@ionic-native/ionic-webview/ngx';

import { PickIdentityPage } from './pages/pickidentity/pickidentity';
import { CreateIdentityPage } from './pages/createidentity/createidentity';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';

import { Observable } from 'rxjs';
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
import { defineCustomElements } from '@teamhive/lottie-player/loader';

defineCustomElements(window);

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
    IonicModule.forRoot(), // Generates a warning "Ionic Angular was already initialized. Make sure IonicModule.forRoot() is just called once" but getSwiper() can't be found without this.
    CommonModule,
    DIDSessionsRoutingModule,
    FormsModule,
    ComponentsModule,
    TranslateModule,
    IonicImageLoader.forRoot()
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
    SplashScreen,
    WebView,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DIDSessionsModule {}
