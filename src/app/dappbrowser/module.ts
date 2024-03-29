import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { GlobalDirectivesModule } from '../helpers/directives/module';
import { NetworkChooserComponentModule } from '../wallet/components/network-chooser/module';
import { WalletChooserComponentModule } from '../wallet/components/wallet-chooser/module';
import { BrowserTitleBarComponent } from './components/titlebar/titlebar.component';
import { URLInputAssistantComponent } from './components/url-input-assistant/url-input-assistant.component';
import { BrowserPage } from './pages/browser/browser';
import { EditFavoritePage } from './pages/edit-favorite/edit-favorite';
import { HomePage } from './pages/home/home';
import { MenuPage } from './pages/menu/menu';
import { DAppBrowserRoutingModule } from './routing';

@NgModule({
  declarations: [
    HomePage,
    BrowserPage,
    MenuPage,
    EditFavoritePage,
    BrowserTitleBarComponent,
    URLInputAssistantComponent
  ],
  imports: [
    CommonModule,
    SharedComponentsModule,
    NetworkChooserComponentModule,
    WalletChooserComponentModule,
    DAppBrowserRoutingModule,
    HttpClientModule,
    FormsModule,
    IonicStorageModule,
    IonicModule,
    TranslateModule,
    GlobalDirectivesModule
  ],
  bootstrap: [],
  entryComponents: [
    HomePage
  ],
  providers: [
    Platform
  ]
})
export class DAppBrowserModule { }
