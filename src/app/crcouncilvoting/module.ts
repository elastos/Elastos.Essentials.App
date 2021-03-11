import { NgModule, ErrorHandler, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy, Platform } from '@ionic/angular';
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

@NgModule({
  declarations: [
    VotePage,
    CandidatesPage,
    HistoryPage,
    CandidateSliderComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    CRCouncilVotingRoutingModule,
    SharedComponentsModule,
    IonicModule,
    IonicStorageModule
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
