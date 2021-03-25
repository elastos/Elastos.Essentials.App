import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { CoinListPage } from './coin-list.page';

@NgModule({
    declarations: [CoinListPage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        FormsModule,
        IonicModule,
        TranslateModule,
        RouterModule.forChild([{ path: '', component: CoinListPage }])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CoinListModule {}