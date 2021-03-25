import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { MnemonicCreatePage } from './mnemonic-create/mnemonic-create.page';
import { MnemonicExportPage } from './mnemonic-export/mnemonic-export.page';
import { MnemonicWritePage } from './mnemonic-write/mnemonic-write.page';

@NgModule({
    declarations: [
        MnemonicCreatePage,
        MnemonicExportPage,
        MnemonicWritePage
    ],
    imports: [
        SharedComponentsModule,
        CommonModule,
        TranslateModule,
        RouterModule.forChild([
            { path: 'create', component: MnemonicCreatePage },
            { path: 'export', component: MnemonicExportPage },
            { path: 'write', component: MnemonicWritePage }
        ])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MnemonicModule {}