import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { CRMemberOptionsComponent } from './options/options.component';

@NgModule({
    declarations: [
        CRMemberOptionsComponent
    ],
    imports: [
        CommonModule,
        IonicModule,
        TranslateModule
    ],
    exports: [
        CRMemberOptionsComponent
    ],
    providers: [
    ],
    entryComponents: [
        CRMemberOptionsComponent
    ],
})
export class ComponentsModule { }
