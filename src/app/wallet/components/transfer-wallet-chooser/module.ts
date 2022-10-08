import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { TransferWalletChooserComponent } from './transfer-wallet-chooser.component';

@NgModule({
  declarations: [
    TransferWalletChooserComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    SharedComponentsModule,
    TranslateModule
  ],
  exports: [
    TransferWalletChooserComponent
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TransferWalletChooserComponentModule { }
