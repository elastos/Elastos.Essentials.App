import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { CurrencySelectPage } from './currency-select/currency-select.page';
import { SettingsPage } from './settings.page';

@NgModule({
    declarations: [SettingsPage, CurrencySelectPage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        TranslateModule,
        RouterModule.forChild([
            { path: '', component: SettingsPage },
            { path: 'currency-select', component: CurrencySelectPage }
        ])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SettingsModule {}