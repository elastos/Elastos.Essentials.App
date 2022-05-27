import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';

@NgModule({
    declarations: [],
    imports: [
        SharedComponentsModule,
        CommonModule,
        FormsModule,
        IonicModule,
        TranslateModule,
        RouterModule,
        RouterModule.forChild([
            { path: 'connect', loadChildren: () => import('./ledger-connect/module').then(m => m.LedgerConnectModule) },
            { path: 'scan', loadChildren: () => import('./ledger-scan/module').then(m => m.LedgerScanModule) },
        ])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LedgerModule {}