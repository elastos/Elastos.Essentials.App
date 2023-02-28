import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { GlobalDirectivesModule } from 'src/app/helpers/directives/module';
import { EthTransactionComponentModule } from 'src/app/wallet/components/eth-transaction/module';
import { StdTransactionComponentModule } from 'src/app/wallet/components/std-transaction/module';
import { TronResourcePage } from './tron-resource.page';

@NgModule({
    declarations: [TronResourcePage],
    imports: [
        SharedComponentsModule,
        GlobalDirectivesModule,
        CommonModule,
        FormsModule,
        IonicModule,
        TranslateModule,
        InlineSVGModule,
        EthTransactionComponentModule,
        StdTransactionComponentModule,
        RouterModule.forChild([{ path: '', component: TronResourcePage }])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TronResourceModule { }