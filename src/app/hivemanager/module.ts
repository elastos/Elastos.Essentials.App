import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { ComponentsModule } from './components/components.module';
import { AdminProviderEditPage } from './pages/admin/adminprovideredit/adminprovideredit.page';
import { AdminProvidersListPage } from './pages/admin/adminproviderslist/adminproviderslist.page';
import { PickPlanPage } from './pages/pickplan/pickplan.page';
import { PickPlanPurchasePage } from './pages/pickplanpurchase/pickplanpurchase.page';
import { PickProviderPage } from './pages/pickprovider/pickprovider.page';
import { HiveManagerRoutingModule } from './routing';



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
    Platform,
    Clipboard
  ],
  schemas:[CUSTOM_ELEMENTS_SCHEMA] // Needed to find ion-back-button, etc
})
export class HiveManagerModule {}
