import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { WalletManagerPage } from './wallet-manager.page';

@NgModule({
    declarations: [WalletManagerPage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        TranslateModule,
        RouterModule.forChild([{ path: '', component: WalletManagerPage }])
    ],
    exports: [RouterModule]
})
export class WalletManagerModule {}