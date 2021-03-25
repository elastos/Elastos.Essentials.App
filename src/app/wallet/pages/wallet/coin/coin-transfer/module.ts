import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { CoinTransferPage } from './coin-transfer.page';

@NgModule({
    declarations: [CoinTransferPage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        TranslateModule,
        RouterModule.forChild([{ path: '', component: CoinTransferPage }])
    ],
    exports: [RouterModule]
})
export class CoinTransferModule {}