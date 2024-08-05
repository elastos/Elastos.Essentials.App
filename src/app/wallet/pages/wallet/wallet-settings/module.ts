import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { ComponentsModule } from 'src/app/wallet/components/components.module';
import { StdTransactionComponentModule } from 'src/app/wallet/components/std-transaction/module';
import { WalletSettingsPage } from './wallet-settings.page';
import { LedgerSignComponentModule } from 'src/app/wallet/components/ledger-sign/module';

@NgModule({
    declarations: [WalletSettingsPage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        FormsModule,
        IonicModule,
        TranslateModule,
        ComponentsModule,
        LedgerSignComponentModule,
        StdTransactionComponentModule,
        RouterModule.forChild([{ path: '', component: WalletSettingsPage }])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class WalletSettingsModule { }