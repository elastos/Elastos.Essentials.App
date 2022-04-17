import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { CandidateOptionsComponent } from './candidate-options/options.component';
import { CRMemberOptionsComponent } from './options/options.component';

@NgModule({
    declarations: [
        CRMemberOptionsComponent,
        CandidateOptionsComponent
    ],
    imports: [
        CommonModule,
        IonicModule,
        TranslateModule
    ],
    exports: [
        CRMemberOptionsComponent,
        CandidateOptionsComponent
    ],
    providers: [
    ],
    entryComponents: [
        CRMemberOptionsComponent,
        CandidateOptionsComponent
    ],
})
export class ComponentsModule { }
