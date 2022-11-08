import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { TxDetailsMultiSigComponent } from './tx-details-multisig.component';

@NgModule({
  declarations: [
    TxDetailsMultiSigComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    SharedComponentsModule,
    TranslateModule
  ],
  exports: [
    TxDetailsMultiSigComponent
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TxDetailsMultisigComponentModule { }
