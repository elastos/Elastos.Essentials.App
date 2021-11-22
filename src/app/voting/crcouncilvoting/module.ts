import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { IonicModule, Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { CandidateSliderComponent } from './components/candidate-slider/candidate-slider.component';
import { ComponentsModule } from './components/components.module';
import { RoundProgressModule } from './components/round-progress/round-progress.module';
import { CandidatesPage } from './pages/candidates/candidates.page';
import { CRMemberPage } from './pages/crmember/crmember.page';
import { CRNodePage } from './pages/crnode/crnode.page';
import { HistoryPage } from './pages/history/history.page';
import { ImpeachCRMemberPage } from './pages/impeach/impeach.page';
import { VotePage } from './pages/vote/vote.page';
import { CRCouncilVotingRoutingModule } from './routing';
@NgModule({
  declarations: [
    VotePage,
    CandidatesPage,
    HistoryPage,
    CRNodePage,
    CRMemberPage,
    ImpeachCRMemberPage,
    CandidateSliderComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    CRCouncilVotingRoutingModule,
    SharedComponentsModule,
    RoundProgressModule,
    IonicModule,
    IonicStorageModule,
    TranslateModule,
    ComponentsModule
  ],
  bootstrap: [],
  entryComponents: [
  ],
  providers: [
    Platform,
    WebView
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CRCouncilVotingModule {}
