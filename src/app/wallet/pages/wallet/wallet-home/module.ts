import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { GlobalDirectivesModule } from 'src/app/helpers/directives/module';
import { WalletHomePage } from './wallet-home.page';

@NgModule({
    declarations: [WalletHomePage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        FormsModule,
        IonicModule,
        TranslateModule,
        GlobalDirectivesModule,
        RouterModule.forChild([{ path: '', component: WalletHomePage }])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class WalletHomeModule { }