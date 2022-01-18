import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { QRCodeModule } from 'angularx-qrcode';
import { ContactsComponent } from './contacts/contacts.component';
import { ETHTransactionComponent } from './eth-transaction/eth-transaction.component';
import { HelpComponent } from './help/help.component';
import { NetworkChooserComponent } from './network-chooser/network-chooser.component';
import { OptionsComponent } from './options/options.component';
import { TokenChooserComponent } from './token-chooser/token-chooser.component';
import { TransferWalletChooserComponent } from './transfer-wallet-chooser/transfer-wallet-chooser.component';
import { TxConfirmComponent } from './tx-confirm/tx-confirm.component';
import { TxSuccessComponent } from './tx-success/tx-success.component';
import { WalletChooserComponent } from './wallet-chooser/wallet-chooser.component';
import { WarningComponent } from './warning/warning.component';

@NgModule({
  declarations: [
    TxConfirmComponent,
    TxSuccessComponent,
    HelpComponent,
    ContactsComponent,
    ETHTransactionComponent,
    OptionsComponent,
    WarningComponent,
    TransferWalletChooserComponent,
    NetworkChooserComponent,
    WalletChooserComponent,
    TokenChooserComponent
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
    TransferWalletChooserComponent,
    NetworkChooserComponent,
    WalletChooserComponent,
    TokenChooserComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ComponentsModule { }
