import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { WalletSettingsPage } from './wallet-settings.page';

@NgModule({
    declarations: [WalletSettingsPage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        TranslateModule,
        RouterModule.forChild([{ path: '', component: WalletSettingsPage }])
    ],
    exports: [RouterModule]
})
export class WalletSettingsModule {}