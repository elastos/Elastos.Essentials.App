import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { WalletAdvancedImportPage } from './wallet-advanced-import.page';

@NgModule({
    declarations: [WalletAdvancedImportPage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        TranslateModule,
        RouterModule.forChild([{ path: '', component: WalletAdvancedImportPage }])
    ],
    exports: [RouterModule]
})
export class WalletAdvancedImportModule {}