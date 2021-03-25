import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { CoinHomePage } from './coin-home.page';

@NgModule({
    declarations: [CoinHomePage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        TranslateModule,
        RouterModule.forChild([{ path: '', component: CoinHomePage }])
    ],
    exports: [RouterModule]
})
export class CoinHomeModule {}