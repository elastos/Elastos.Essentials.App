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
import { WarningComponent } from './warning/warning.component';
import { TransferWalletChooserComponent } from './transfer-wallet-chooser/transfer-wallet-chooser.component';
import { OptionsComponent } from './options/options.component';
import { ETHTransactionComponent } from './eth-transaction/eth-transaction.component';

@NgModule({
  declarations: [
    TxConfirmComponent,
    TxSuccessComponent,
    HelpComponent,
    ContactsComponent,
    ETHTransactionComponent,
    OptionsComponent,
    WarningComponent,
    TransferWalletChooserComponent
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
    ContactsComponent,
    OptionsComponent,
    WarningComponent,
    ETHTransactionComponent,
    TransferWalletChooserComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ComponentsModule { }
