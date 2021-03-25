import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { CoinTxInfoPage } from './coin-tx-info.page';

@NgModule({
    declarations: [CoinTxInfoPage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        TranslateModule,
        RouterModule.forChild([{ path: '', component: CoinTxInfoPage }])
    ],
    exports: [RouterModule]
})
export class CoinTxInfoModule {}