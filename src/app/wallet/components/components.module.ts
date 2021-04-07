import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { QRCodeModule } from 'angularx-qrcode';
import { TranslateModule } from '@ngx-translate/core';
import { ContactsComponent } from './contacts/contacts.component';
import { HelpComponent } from './help/help.component';
import { TxConfirmComponent } from './tx-confirm/tx-confirm.component';
import { TxSuccessComponent } from './tx-success/tx-success.component';

@NgModule({
  declarations: [
    TxConfirmComponent,
    TxSuccessComponent,
    HelpComponent,
    ContactsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    QRCodeModule,
    TranslateModule,
  ],
  exports: [
  ],
  providers: [
  ],
  entryComponents: [
    TxConfirmComponent,
    TxSuccessComponent,
    HelpComponent,
    ContactsComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ComponentsModule { }
