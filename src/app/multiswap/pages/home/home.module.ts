import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { EthTransactionComponentModule } from 'src/app/wallet/components/eth-transaction/module';
import { LedgerSignComponentModule } from 'src/app/wallet/components/ledger-sign/module';
import { TokenChooserComponentModule } from '../../components/token-chooser/module';
import { HomePage } from './home';

@NgModule({
  declarations: [HomePage],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    TranslateModule,
    SharedComponentsModule,
    EthTransactionComponentModule,
    LedgerSignComponentModule,
    TokenChooserComponentModule,
    RouterModule.forChild([{
      path: '',
      component: HomePage,
    }])
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomeModule { }
