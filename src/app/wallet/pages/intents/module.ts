import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { EthTransactionComponentModule } from '../../components/eth-transaction/module';
import { LedgerSignComponentModule } from '../../components/ledger-sign/module';
import { StdTransactionComponentModule } from '../../components/std-transaction/module';
import { WalletChooserComponentModule } from '../../components/wallet-chooser/module';
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
        LedgerSignComponentModule,
        SharedComponentsModule,
        StdTransactionComponentModule,
        CommonModule,
        FormsModule,
        IonicModule,
        TranslateModule,
        WalletChooserComponentModule,
        InlineSVGModule,
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