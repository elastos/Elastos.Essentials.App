import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Platform } from '@ionic/angular';
import { HiveManagerRoutingModule } from './routing';
import { IonicStorageModule } from '@ionic/storage';
import { PickProviderPage } from './pages/pickprovider/pickprovider.page';
import { PopupService } from './services/popup.service';
import { TranslateModule } from '@ngx-translate/core';

import { AdminProvidersListPage } from './pages/admin/adminproviderslist/adminproviderslist.page';
import { AdminProviderEditPage } from './pages/admin/adminprovideredit/adminprovideredit.page';
import { FormsModule } from '@angular/forms';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { PickPlanPage } from './pages/pickplan/pickplan.page';
import { PickPlanPurchasePage } from './pages/pickplanpurchase/pickplanpurchase.page';
import { ComponentsModule } from './components/components.module';

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { SharedComponentsModule } from '../components/sharedcomponents.module';

@NgModule({
  declarations: [
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
    HiveManagerRoutingModule,
    TranslateModule,
    IonicStorageModule.forRoot()
  ],
  bootstrap: [],
  entryComponents: [
  ],
  providers: [
    PopupService,
    Platform,
    Clipboard
  ],
  schemas:[CUSTOM_ELEMENTS_SCHEMA] // Needed to find ion-back-button, etc
})
export class HiveManagerModule {}
