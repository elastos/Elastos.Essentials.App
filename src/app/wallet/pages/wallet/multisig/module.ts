import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';

@NgModule({
    declarations: [
    ],
    imports: [
        SharedComponentsModule,
        CommonModule,
        FormsModule,
        IonicModule,
        TranslateModule,
        RouterModule,
        RouterModule.forChild([
            { path: 'standard/create', loadChildren: () => import('./standard/std-multisig-create/module').then(m => m.MultiSigStandardCreateModule) },
            { path: 'standard/info', loadChildren: () => import('./standard/multisig-info/module').then(m => m.MultiSigInfoModule) }
        ])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MultiSigModule { }