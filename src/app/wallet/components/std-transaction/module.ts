import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { StdTransactionComponent } from './std-transaction.component';

@NgModule({
  declarations: [
    StdTransactionComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule,
    SharedComponentsModule
  ],
  exports: [
    StdTransactionComponent
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class StdTransactionComponentModule { }
