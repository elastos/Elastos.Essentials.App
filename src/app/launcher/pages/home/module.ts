import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { NetworkChooserComponentModule } from 'src/app/wallet/components/network-chooser/module';
import { SharedComponentsModule } from '../../../components/sharedcomponents.module';
import { GlobalDirectivesModule } from '../../../helpers/directives/module';
import { OptionsComponentsModule } from '../../components/options/module';
import { WalletAddressChooserComponentsModule } from '../../components/wallet-address-chooser/module';
import { NewsConfiguratorComponentsModule } from '../../widgets/builtin/news/components/configurator/module';
import { WidgetModule } from '../../widgets/module';
import { HomePage } from './home.page';

@NgModule({
  declarations: [
    HomePage
  ],
  imports: [
    CommonModule,
    IonicModule,
    HttpClientModule,
    SharedComponentsModule,
    TranslateModule,
    GlobalDirectivesModule,
    WalletAddressChooserComponentsModule,
    OptionsComponentsModule,
    NetworkChooserComponentModule,
    NewsConfiguratorComponentsModule,
    WidgetModule,
    RouterModule.forChild([{ path: '', component: HomePage }])
  ],
  providers: [],
  bootstrap: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomePageModule { }
