import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { CrVotesComponent } from './crvotes/crvotes.component';
import { MileStoneOptionsComponent } from './milestone-options/milestone-options.component';
import { ProposalTitleBarComponent } from './titlebar/titlebar.component';
import { VoteResultComponent } from './vote-result/vote-result.component';

@NgModule({
    declarations: [
        CrVotesComponent,
        VoteResultComponent,
        MileStoneOptionsComponent,
        ProposalTitleBarComponent,
    ],
    imports: [
        CommonModule,
        IonicModule,
        TranslateModule
    ],
    exports: [
        CrVotesComponent,
        VoteResultComponent,
        MileStoneOptionsComponent,
        ProposalTitleBarComponent,
    ],
    providers: [
    ],
    entryComponents: [
        CrVotesComponent,
        VoteResultComponent,
        MileStoneOptionsComponent,
        ProposalTitleBarComponent,
    ],
})
export class ComponentsModule { }
