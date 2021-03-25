import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { ComponentsModule } from '../../components/components.module';
import { ExportmnemonicPage } from './exportmnemonic.page';

@NgModule({
    declarations: [ExportmnemonicPage],
    imports: [
        SharedComponentsModule,
        ComponentsModule,
        CommonModule,
        TranslateModule,
        RouterModule.forChild([{ path: '', component: ExportmnemonicPage }])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ExportMnemonicModule {}