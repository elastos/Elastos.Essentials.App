import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { WalletEditNamePage } from './wallet-edit-name.page';

@NgModule({
    declarations: [WalletEditNamePage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        TranslateModule,
        RouterModule.forChild([{ path: '', component: WalletEditNamePage }])
    ],
    exports: [RouterModule]
})
export class WalletEditNameModule {}