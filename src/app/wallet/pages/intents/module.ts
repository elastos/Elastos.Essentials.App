import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { EthTransactionComponentModule } from '../../components/eth-transaction/module';
import { AccessPage } from './access/access.page';
import { DidTransactionPage } from './didtransaction/didtransaction.page';
import { DPoSVotePage } from './dposvote/dposvote.page';
import { EscTransactionPage } from './esctransaction/esctransaction.page';
import { EthSignPage } from './ethsign/ethsign.page';
import { MultiSigTxPage } from './multisigtx/multisigtx.page';
import { PersonalSignPage } from './personalsign/personalsign.page';
import { SelectSubwalletPage } from './select-subwallet/select-subwallet.page';
import { SignTypedDataPage } from './signtypeddata/signtypeddata.page';

@NgModule({
    declarations: [
        AccessPage,
        DidTransactionPage,
        DPoSVotePage,
        EscTransactionPage,
        SelectSubwalletPage,
        SignTypedDataPage,
        PersonalSignPage,
        EthSignPage,
        MultiSigTxPage
    ],
    imports: [
        EthTransactionComponentModule,
        SharedComponentsModule,
        CommonModule,
        FormsModule,
        IonicModule,
        TranslateModule,
        RouterModule,
        RouterModule.forChild([
            { path: 'access', component: AccessPage },
            { path: 'didtransaction', component: DidTransactionPage },
            { path: 'esctransaction', component: EscTransactionPage },
            { path: 'signtypeddata', component: SignTypedDataPage },
            { path: 'personalsign', component: PersonalSignPage },
            { path: 'insecureethsign', component: EthSignPage },
            { path: 'dposvote', component: DPoSVotePage },
            { path: 'access', component: AccessPage },
            { path: 'select-subwallet', component: SelectSubwalletPage },
            { path: 'multisigtx', component: MultiSigTxPage },
        ])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class IntentsModule { }