import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { CoinReceivePage } from './coin-receive.page';

@NgModule({
    declarations: [CoinReceivePage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        TranslateModule,
        RouterModule.forChild([{ path: '', component: CoinReceivePage }])
    ],
    exports: [RouterModule]
})
export class CoinReceiveModule {}