import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { ComponentsModule } from 'src/app/wallet/components/components.module';
import { ContactsComponentModule } from 'src/app/wallet/components/contacts/module';
import { EthTransactionComponentModule } from 'src/app/wallet/components/eth-transaction/module';
import { LedgerSignComponentModule } from 'src/app/wallet/components/ledger-sign/module';
import { TransferWalletChooserComponentModule } from 'src/app/wallet/components/transfer-wallet-chooser/module';
import { CoinTransferPage } from './coin-transfer.page';

@NgModule({
    declarations: [CoinTransferPage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        FormsModule,
        IonicModule,
        TranslateModule,
        LedgerSignComponentModule,
        ContactsComponentModule,
        TransferWalletChooserComponentModule,
        ComponentsModule,
        EthTransactionComponentModule,
        RouterModule.forChild([{ path: '', component: CoinTransferPage }])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CoinTransferModule { }