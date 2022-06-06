import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { GlobalDirectivesModule } from 'src/app/helpers/directives/module';
import { LedgerGetAddressComponentModule } from 'src/app/wallet/components/ledger-getaddress/module';
import { NetworkChooserComponentModule } from 'src/app/wallet/components/network-chooser/module';
import { WalletChooserComponentModule } from 'src/app/wallet/components/wallet-chooser/module';
import { WalletHomePage } from './wallet-home.page';

@NgModule({
        declarations: [WalletHomePage],
        imports: [
                SharedComponentsModule,
                CommonModule,
                FormsModule,
                IonicModule,
                TranslateModule,
                GlobalDirectivesModule,
                WalletChooserComponentModule,
                NetworkChooserComponentModule,
                RouterModule.forChild([{ path: '', component: WalletHomePage }]),
                LedgerGetAddressComponentModule
        ],
        exports: [RouterModule],
        schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class WalletHomeModule { }