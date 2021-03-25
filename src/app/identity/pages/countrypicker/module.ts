import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { ComponentsModule } from '../../components/components.module';
import { CountryPickerPage } from './countrypicker';

@NgModule({
    declarations: [CountryPickerPage],
    imports: [
        SharedComponentsModule,
        ComponentsModule,
        CommonModule,
        TranslateModule,
        RouterModule.forChild([{ path: '', component: CountryPickerPage }])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CountryPickerModule {}