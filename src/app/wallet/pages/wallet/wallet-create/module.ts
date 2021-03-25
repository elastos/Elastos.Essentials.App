import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { WalletCreatePage } from './wallet-create.page';

@NgModule({
    declarations: [WalletCreatePage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        TranslateModule,
        RouterModule.forChild([{ path: '', component: WalletCreatePage }])
    ],
    exports: [RouterModule]
})
export class WalletCreateModule {}