import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { CrVotesComponent } from './crvotes/crvotes.component';
import { MileStoneOptionsComponent } from './milestone-options/milestone-options.component';
import { TitleOptionsComponent } from './title-options/title-options.component';
import { ProposalTitleBarComponent } from './titlebar/titlebar.component';
import { VoteResultComponent } from './vote-result/vote-result.component';

@NgModule({
    declarations: [
        CrVotesComponent,
        VoteResultComponent,
        MileStoneOptionsComponent,
        TitleOptionsComponent,
        ProposalTitleBarComponent,
    ],
    imports: [
        CommonModule,
        IonicModule,
        SharedComponentsModule,
        TranslateModule
    ],
    exports: [
        CrVotesComponent,
        VoteResultComponent,
        MileStoneOptionsComponent,
        TitleOptionsComponent,
        ProposalTitleBarComponent,
    ],
    providers: [
    ],
    entryComponents: [
        CrVotesComponent,
        VoteResultComponent,
        MileStoneOptionsComponent,
        TitleOptionsComponent,
        ProposalTitleBarComponent,
    ],
})
export class ComponentsModule { }
