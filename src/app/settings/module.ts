import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { GlobalDirectivesModule } from '../helpers/directives/module';
import { SettingsWarningComponent } from './components/warning/warning.component';
import { AboutPage } from './pages/about/about.page';
import { DeveloperPage } from './pages/developer/developer.page';
import { DevTestsPage } from './pages/devtests/devtests.page';
import { ElastosAPIProviderPage } from './pages/elastosapiprovider/elastosapiprovider.page';
import { LanguagePage } from './pages/language/language.page';
import { MenuPage } from './pages/menu/menu.page';
import { PrivacyPage } from './pages/privacy/privacy.page';
import { StartupScreenPage } from './pages/startupscreen/startupscreen.page';
import { WalletConnectConnectPage } from './pages/walletconnect/connect/connect.page';
import { WalletConnectConnectV2Page } from './pages/walletconnect/connectv2/connectv2.page';
import { WalletConnectPrepareToConnectPage } from './pages/walletconnect/preparetoconnect/preparetoconnect.page';
import { WalletConnectSessionsPage } from './pages/walletconnect/sessions/sessions.page';
import { SettingsRoutingModule } from './routing';


@NgModule({
  declarations: [
    SettingsWarningComponent,
    MenuPage,
    AboutPage,
    LanguagePage,
    DeveloperPage,
    DevTestsPage,
    WalletConnectPrepareToConnectPage,
    WalletConnectConnectPage,
    WalletConnectConnectV2Page,
    WalletConnectSessionsPage,
    PrivacyPage,
    ElastosAPIProviderPage,
    StartupScreenPage
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    SettingsRoutingModule,
    IonicModule,
    IonicStorageModule,
    SharedComponentsModule,
    TranslateModule,
    GlobalDirectivesModule
  ],
  bootstrap: [],
  entryComponents: [
    SettingsWarningComponent
  ],
  providers: [
    Platform
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SettingsModule { }
