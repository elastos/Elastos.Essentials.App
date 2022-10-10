import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { ComponentsModule } from 'src/app/wallet/components/components.module';
import { TxDetailsMultisigComponentModule } from 'src/app/wallet/components/tx-details-multisig/module';
import { CoinTxInfoPage } from './coin-tx-info.page';

@NgModule({
    declarations: [CoinTxInfoPage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        ComponentsModule,
        FormsModule,
        IonicModule,
        TranslateModule,
        TxDetailsMultisigComponentModule,
        InlineSVGModule,
        RouterModule.forChild([{ path: '', component: CoinTxInfoPage }])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CoinTxInfoModule { }