import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { WalletCreateNamePage } from './wallet-create-name.page';

@NgModule({
    declarations: [WalletCreateNamePage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        TranslateModule,
        RouterModule.forChild([{ path: '', component: WalletCreateNamePage }])
    ],
    exports: [RouterModule]
})
export class WalletCreateNameModule {}