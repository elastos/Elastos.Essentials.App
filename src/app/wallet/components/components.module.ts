import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { QRCodeModule } from 'angularx-qrcode';
import { SharedComponentsModule } from "src/app/components/sharedcomponents.module";

import { HelpComponent } from './help/help.component';
import { OptionsComponent } from './options/options.component';
import { TxConfirmComponent } from './tx-confirm/tx-confirm.component';
import { TxSuccessComponent } from './tx-success/tx-success.component';
import { WarningComponent } from './warning/warning.component';

@NgModule({
  declarations: [
    TxConfirmComponent,
    TxSuccessComponent,
    HelpComponent,
    OptionsComponent,
    WarningComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    QRCodeModule,
    SharedComponentsModule,
    TranslateModule,
  ],
  exports: [],
  providers: [
  ],
  entryComponents: [
    HelpComponent,
    OptionsComponent,
    TxConfirmComponent,
    TxSuccessComponent,
    WarningComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ComponentsModule { }
