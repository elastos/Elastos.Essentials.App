import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, Platform } from '@ionic/angular';
import { SettingsRoutingModule } from './routing';
import { IonicStorageModule } from '@ionic/storage';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { SettingsWarningComponent } from './components/warning/warning.component';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { MenuPage } from './pages/menu/menu.page';
import { TranslateModule } from '@ngx-translate/core';
import { AboutPage } from './pages/about/about.page';
import { SelectNetPage } from './pages/select-net/select-net.page';
import { LanguagePage } from './pages/language/language.page';
import { DeveloperPage } from './pages/developer/developer.page';
import { DevTestsPage } from './pages/devtests/devtests.page';
import { WalletConnectConnectPage } from './pages/walletconnect/connect/connect.page';
import { WalletConnectSessionsPage } from './pages/walletconnect/sessions/sessions.page';
import { WalletConnectPrepareToConnectPage } from './pages/walletconnect/preparetoconnect/preparetoconnect.page';
import { PrivacyPage } from './pages/privacy/privacy.page';
import { ElastosAPIProviderPage } from './pages/elastosapiprovider/elastosapiprovider.page';
import { StartupScreenPage } from './pages/startupscreen/startupscreen.page';

@NgModule({
  declarations: [
    SettingsWarningComponent,
    MenuPage,
    AboutPage,
    SelectNetPage,
    LanguagePage,
    DeveloperPage,
    DevTestsPage,
    WalletConnectPrepareToConnectPage,
    WalletConnectConnectPage,
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
    TranslateModule
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
export class SettingsModule {}
