import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { CrVotesComponent } from './crvotes/crvotes.component';
import { MileStoneOptionsComponent } from './milestone-options/milestone-options.component';
import { VoteResultComponent } from './vote-result/vote-result.component';

@NgModule({
    declarations: [
        CrVotesComponent,
        VoteResultComponent,
        MileStoneOptionsComponent
    ],
    imports: [
        CommonModule,
        IonicModule,
        TranslateModule
    ],
    exports: [
        CrVotesComponent,
        VoteResultComponent,
        MileStoneOptionsComponent
    ],
    providers: [
    ],
    entryComponents: [
        CrVotesComponent,
        VoteResultComponent,
        MileStoneOptionsComponent
    ],
})
export class ComponentsModule { }
