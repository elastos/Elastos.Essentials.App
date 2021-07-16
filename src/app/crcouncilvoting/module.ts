import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, Platform } from '@ionic/angular';
import { CRCouncilVotingRoutingModule } from './routing';
import { HttpClientModule } from '@angular/common/http';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { IonicStorageModule } from '@ionic/storage';

import { FormsModule } from '@angular/forms';

import { SharedComponentsModule } from '../components/sharedcomponents.module';

import { CandidatesPage } from './pages/candidates/candidates.page';
import { HistoryPage } from './pages/history/history.page';
import { VotePage } from './pages/vote/vote.page';
import { CandidateSliderComponent } from './components/candidate-slider/candidate-slider.component';
import { TranslateModule } from '@ngx-translate/core';
import { CRNodePage } from './pages/crnode/crnode.page';

@NgModule({
  declarations: [
    VotePage,
    CandidatesPage,
    HistoryPage,
    CRNodePage,
    CandidateSliderComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    CRCouncilVotingRoutingModule,
    SharedComponentsModule,
    IonicModule,
    IonicStorageModule,
    TranslateModule
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
