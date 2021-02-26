import { NgModule, ErrorHandler, Injectable } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy, Platform } from '@ionic/angular';
import { AppRoutingModule } from './routing';
import { IonicStorageModule } from '@ionic/storage';
import { SignInPage } from './pages/signin/signin.page';
import { PickProviderPage } from './pages/pickprovider/pickprovider.page';
import { StorageService } from './services/storage.service';
import { PopupService } from './services/popup.service';
import { TranslateService, TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { AdminProvidersListPage } from './pages/admin/adminproviderslist/adminproviderslist.page';
import { AdminProviderEditPage } from './pages/admin/adminprovideredit/adminprovideredit.page';
import { FormsModule } from '@angular/forms';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { PickPlanPage } from './pages/pickplan/pickplan.page';
import { PickPlanPurchasePage } from './pages/pickplanpurchase/pickplanpurchase.page';
import { ComponentsModule } from './components/components.module';

import { zh } from '../../assets/translations/hivemanager/zh';
import { en } from '../../assets/translations/hivemanager/en';
import { fr } from '../../assets/translations/hivemanager/fr';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { SharedComponentsModule } from '../components/sharedcomponents.module';

@NgModule({
  declarations: [
    SignInPage,
    PickProviderPage,
    PickPlanPage,
    PickPlanPurchasePage,
    AdminProvidersListPage,
    AdminProviderEditPage
  ],
  imports: [
    CommonModule,
    FormsModule,
    ComponentsModule,
    SharedComponentsModule,
    AppRoutingModule,
    TranslateModule,
    IonicStorageModule.forRoot()
  ],
  bootstrap: [],
  entryComponents: [
  ],
  providers: [
    StorageService,
    PopupService,
    Platform,
    Clipboard
  ],
  schemas:[CUSTOM_ELEMENTS_SCHEMA] // Needed to find ion-back-button, etc
})
export class HiveManagerModule {}
