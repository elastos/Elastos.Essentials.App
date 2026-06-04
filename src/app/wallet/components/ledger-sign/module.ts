import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { LedgerSignComponent } from './ledger-sign.component';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';

@NgModule({
  declarations: [
    LedgerSignComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule,
    SharedComponentsModule
  ],
  exports: [
    LedgerSignComponent
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LedgerSignComponentModule { }
