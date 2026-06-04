import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { CurrencySelectPage } from './currency-select/currency-select.page';
import { CustomNetworksPage } from './custom-networks/custom-networks.page';
import { EditBuiltinNetworkPage } from './edit-builtin-network/edit-builtin-network.page';
import { EditCustomNetworkPage } from './edit-custom-network/edit-custom-network.page';
import { EditRpcProvidersPage } from './edit-rpc-providers/edit-rpc-providers.page';
import { ManageNetworksPage } from './manage-networks/manage-networks.page';
import { SettingsPage } from './settings.page';

@NgModule({
  declarations: [
    SettingsPage,
    ManageNetworksPage,
    CurrencySelectPage,
    CustomNetworksPage,
    EditCustomNetworkPage,
    EditBuiltinNetworkPage,
    EditRpcProvidersPage
  ],
  imports: [
    SharedComponentsModule,
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    RouterModule.forChild([
      { path: '', component: SettingsPage },
      { path: 'currency-select', component: CurrencySelectPage },
      { path: 'manage-networks', component: ManageNetworksPage },
      { path: 'custom-networks', component: CustomNetworksPage },
      { path: 'edit-custom-network', component: EditCustomNetworkPage },
      { path: 'edit-builtin-network', component: EditBuiltinNetworkPage },
      { path: 'edit-rpc-providers', component: EditRpcProvidersPage }
    ])
  ],
  exports: [RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SettingsModule {}
