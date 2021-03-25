import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { WalletPasswordResetPage } from './wallet-password-reset.page';

@NgModule({
    declarations: [WalletPasswordResetPage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        TranslateModule,
        RouterModule.forChild([{ path: '', component: WalletPasswordResetPage }])
    ],
    exports: [RouterModule]
})
export class WalletPasswordResetModule {}